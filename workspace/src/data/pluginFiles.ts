export type Lang = "php" | "js" | "css";

export interface PluginFile {
  path: string;
  lang: Lang;
  desc: string;
  code: string;
}

export const PLUGIN_SLUG = "reserva-salas";
export const PLUGIN_VERSION = "1.0.0";

const main = `<?php
/**
 * Plugin Name:       Reserva Salas
 * Plugin URI:        https://example.com/reserva-salas
 * Description:       Agendar salas de reunion con los usuarios de WordPress: disponibilidad por franjas, shortcode [reserva_salas], API REST propia y confirmacion por correo con wp_mail().
 * Version:           1.0.0
 * Author:            Estudio Andamio
 * License:           GPL-2.0-or-later
 * Text Domain:       reserva-salas
 * Requires PHP:      7.4
 * Requires at least: 6.0
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Sin acceso directo al archivo.
}

define( 'RS_VERSION', '1.0.0' );
define( 'RS_PATH', plugin_dir_path( __FILE__ ) );
define( 'RS_URL', plugin_dir_url( __FILE__ ) );

require_once RS_PATH . 'includes/class-rs-db.php';
require_once RS_PATH . 'includes/class-rs-reservas.php';
require_once RS_PATH . 'includes/class-rs-correos.php';
require_once RS_PATH . 'includes/class-rs-admin.php';
require_once RS_PATH . 'includes/class-rs-shortcode.php';

// Al activar: crear tablas, sembrar salas de ejemplo y ajustes por defecto.
register_activation_hook( __FILE__, array( 'RS_DB', 'instalar' ) );

add_action( 'plugins_loaded', 'rs_iniciar' );
/**
 * Arranque del plugin: API REST, shortcode y pantallas de administracion.
 */
function rs_iniciar() {
    RS_Reservas::iniciar();   // Endpoints /wp-json/reserva-salas/v1/...
    RS_Shortcode::iniciar();  // Shortcode [reserva_salas]

    if ( is_admin() ) {
        RS_Admin::iniciar();  // Menu "Salas" en el escritorio.
    }
}
`;

const db = `<?php
/**
 * Esquema de base de datos y consultas compartidas.
 *
 * Tablas creadas:
 *   {prefix}rs_salas     -> catalogo de salas
 *   {prefix}rs_reservas  -> reservas confirmadas / canceladas
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RS_DB {

    /** Nombres de tablas con el prefijo de la instalacion. */
    public static function tablas() {
        global $wpdb;
        return array(
            'salas'    => $wpdb->prefix . 'rs_salas',
            'reservas' => $wpdb->prefix . 'rs_reservas',
        );
    }

    /** Crea las tablas con dbDelta() y siembra datos iniciales. */
    public static function instalar() {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $t       = self::tablas();
        $charset = $wpdb->get_charset_collate();

        dbDelta(
            "CREATE TABLE {$t['salas']} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                nombre varchar(120) NOT NULL,
                ubicacion varchar(160) DEFAULT '',
                capacidad int(11) NOT NULL DEFAULT 4,
                color varchar(7) DEFAULT '#1f7a4d',
                activa tinyint(1) NOT NULL DEFAULT 1,
                PRIMARY KEY  (id)
            ) $charset;"
        );

        dbDelta(
            "CREATE TABLE {$t['reservas']} (
                id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
                sala_id bigint(20) unsigned NOT NULL,
                user_id bigint(20) unsigned NOT NULL,
                titulo varchar(160) DEFAULT '',
                fecha date NOT NULL,
                hora_inicio time NOT NULL,
                hora_fin time NOT NULL,
                estado varchar(20) NOT NULL DEFAULT 'confirmada',
                creada_en datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY  (id),
                KEY sala_fecha (sala_id, fecha),
                KEY usuario (user_id)
            ) $charset;"
        );

        // Solo en la primera activacion: dos salas de ejemplo.
        if ( ! get_option( 'rs_semilla_hecha' ) ) {
            $wpdb->insert( $t['salas'], array(
                'nombre'    => 'Sala Norte',
                'ubicacion' => 'Piso 2 · Edificio A',
                'capacidad' => 8,
                'color'     => '#1f7a4d',
            ) );
            $wpdb->insert( $t['salas'], array(
                'nombre'    => 'Sala Agora',
                'ubicacion' => 'Piso 1 · Junto a recepcion',
                'capacidad' => 12,
                'color'     => '#e4572e',
            ) );
            update_option( 'rs_semilla_hecha', 1 );
        }

        // Ajustes por defecto (add_option no sobreescribe valores existentes).
        add_option( 'rs_hora_inicio', '08:00' );
        add_option( 'rs_hora_fin', '18:00' );
        add_option( 'rs_intervalo', '30' );
        add_option( 'rs_notificar_admin', '1' );

        update_option( 'rs_version', RS_VERSION );
    }

    /** Salas activas ordenadas por nombre. */
    public static function salas_activas() {
        global $wpdb;
        $t = self::tablas();
        return $wpdb->get_results( "SELECT * FROM {$t['salas']} WHERE activa = 1 ORDER BY nombre ASC" );
    }

    /** Una sala por ID (o null). */
    public static function sala( $id ) {
        global $wpdb;
        $t = self::tablas();
        return $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$t['salas']} WHERE id = %d", $id ) );
    }

    /**
     * Regla de solapamiento de intervalos:
     * dos reservas chocan si  inicio_a < fin_b  AND  fin_a > inicio_b.
     */
    public static function hay_conflicto( $sala_id, $fecha, $inicio, $fin, $excluir_id = 0 ) {
        global $wpdb;
        $t   = self::tablas();
        $sql = $wpdb->prepare(
            "SELECT COUNT(*) FROM {$t['reservas']}
             WHERE sala_id = %d
               AND fecha = %s
               AND estado = 'confirmada'
               AND hora_inicio < %s
               AND hora_fin > %s",
            $sala_id, $fecha, $fin, $inicio
        );

        if ( $excluir_id > 0 ) {
            $sql .= $wpdb->prepare( ' AND id <> %d', $excluir_id );
        }

        return (int) $wpdb->get_var( $sql ) > 0;
    }

    /** Franjas ocupadas de una sala en una fecha concreta. */
    public static function ocupadas( $sala_id, $fecha ) {
        global $wpdb;
        $t = self::tablas();
        return $wpdb->get_results( $wpdb->prepare(
            "SELECT id, hora_inicio, hora_fin, titulo
             FROM {$t['reservas']}
             WHERE sala_id = %d AND fecha = %s AND estado = 'confirmada'
             ORDER BY hora_inicio ASC",
            $sala_id, $fecha
        ) );
    }
}
`;

const reservas = `<?php
/**
 * API REST del plugin.
 *
 * Endpoints bajo /wp-json/reserva-salas/v1/:
 *   GET  /salas               -> catalogo de salas activas
 *   GET  /disponibilidad      -> franjas ocupadas de una sala y fecha
 *   POST /reservar            -> crea la reserva (requiere sesion)
 *   GET  /mis-reservas        -> reservas del usuario actual
 *   POST /cancelar/{id}       -> cancela (solo dueno o admin)
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RS_Reservas {

    public static function iniciar() {
        add_action( 'rest_api_init', array( __CLASS__, 'rutas' ) );
    }

    public static function rutas() {
        $ns = 'reserva-salas/v1';

        register_rest_route( $ns, '/salas', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'listar_salas' ),
            'permission_callback' => '__return_true',
        ) );

        register_rest_route( $ns, '/disponibilidad', array(
            'methods'             => 'GET',
            'callback'            => array( __CLASS__, 'disponibilidad' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'sala_id' => array( 'required' => true, 'sanitize_callback' => 'absint' ),
                'fecha'   => array( 'required' => true, 'sanitize_callback' => array( __CLASS__, 'san_fecha' ) ),
            ),
        ) );

        register_rest_route( $ns, '/reservar', array(
            'methods'  => 'POST',
            'callback' => array( __CLASS__, 'reservar' ),
            // Solo usuarios con sesion iniciada pueden reservar.
            'permission_callback' => function () {
                return is_user_logged_in();
            },
        ) );

        register_rest_route( $ns, '/mis-reservas', array(
            'methods'  => 'GET',
            'callback' => array( __CLASS__, 'mis_reservas' ),
            'permission_callback' => function () {
                return is_user_logged_in();
            },
        ) );

        register_rest_route( $ns, '/cancelar/(?P<id>\\d+)', array(
            'methods'  => 'POST',
            'callback' => array( __CLASS__, 'cancelar' ),
            'permission_callback' => function () {
                return is_user_logged_in();
            },
        ) );
    }

    /** Valida formato AAAA-MM-DD. */
    public static function san_fecha( $valor ) {
        $valor = sanitize_text_field( $valor );
        return preg_match( '/^\\d{4}-\\d{2}-\\d{2}$/', $valor ) ? $valor : '';
    }

    /** Valida formato HH:MM en 24 h. */
    public static function san_hora( $valor ) {
        $valor = sanitize_text_field( $valor );
        return preg_match( '/^([01]\\d|2[0-3]):[0-5]\\d$/', $valor ) ? $valor : '';
    }

    public static function listar_salas() {
        $salas = array();
        foreach ( RS_DB::salas_activas() as $sala ) {
            $salas[] = array(
                'id'        => (int) $sala->id,
                'nombre'    => $sala->nombre,
                'ubicacion' => $sala->ubicacion,
                'capacidad' => (int) $sala->capacidad,
                'color'     => $sala->color,
            );
        }
        return rest_ensure_response( $salas );
    }

    public static function disponibilidad( $request ) {
        $sala_id = (int) $request->get_param( 'sala_id' );
        $fecha   = $request->get_param( 'fecha' );

        if ( ! $fecha || ! RS_DB::sala( $sala_id ) ) {
            return new WP_Error( 'rs_datos', 'Sala o fecha no validos.', array( 'status' => 400 ) );
        }

        return rest_ensure_response( array(
            'sala_id'  => $sala_id,
            'fecha'    => $fecha,
            'ocupadas' => RS_DB::ocupadas( $sala_id, $fecha ),
        ) );
    }

    /** Crea la reserva tras validar todo en servidor. */
    public static function reservar( $request ) {
        global $wpdb;

        $user    = wp_get_current_user();
        $sala_id = absint( $request->get_param( 'sala_id' ) );
        $titulo  = sanitize_text_field( $request->get_param( 'titulo' ) );
        $fecha   = self::san_fecha( $request->get_param( 'fecha' ) );
        $inicio  = self::san_hora( $request->get_param( 'hora_inicio' ) );
        $fin     = self::san_hora( $request->get_param( 'hora_fin' ) );

        if ( ! $sala_id || ! $fecha || ! $inicio || ! $fin ) {
            return new WP_Error( 'rs_datos', 'Faltan datos o el formato no es valido.', array( 'status' => 400 ) );
        }
        if ( ! RS_DB::sala( $sala_id ) ) {
            return new WP_Error( 'rs_sala', 'La sala no existe o no esta activa.', array( 'status' => 400 ) );
        }
        if ( $inicio >= $fin ) {
            return new WP_Error( 'rs_horas', 'La hora final debe ser posterior a la inicial.', array( 'status' => 400 ) );
        }

        // Doble comprobacion: la franja pudo ocuparse hace un segundo.
        if ( RS_DB::hay_conflicto( $sala_id, $fecha, $inicio, $fin ) ) {
            return new WP_Error(
                'rs_conflicto',
                'Esa franja acaba de ocuparse. Elige otra, por favor.',
                array( 'status' => 409 )
            );
        }

        $ok = $wpdb->insert(
            RS_DB::tablas()['reservas'],
            array(
                'sala_id'     => $sala_id,
                'user_id'     => $user->ID,
                'titulo'      => $titulo !== '' ? $titulo : 'Reunion',
                'fecha'       => $fecha,
                'hora_inicio' => $inicio,
                'hora_fin'    => $fin,
                'estado'      => 'confirmada',
            ),
            array( '%d', '%d', '%s', '%s', '%s', '%s', '%s' )
        );

        if ( ! $ok ) {
            return new WP_Error( 'rs_db', 'No se pudo guardar la reserva.', array( 'status' => 500 ) );
        }

        $reserva_id = (int) $wpdb->insert_id;

        // Correo de confirmacion al usuario (y al admin si esta activado).
        RS_Correos::confirmacion( $reserva_id );

        return rest_ensure_response( array(
            'ok'      => true,
            'reserva' => array(
                'id'          => $reserva_id,
                'sala_id'     => $sala_id,
                'titulo'      => $titulo,
                'fecha'       => $fecha,
                'hora_inicio' => $inicio,
                'hora_fin'    => $fin,
            ),
        ) );
    }

    /** Reservas futuras del usuario actual. */
    public static function mis_reservas() {
        global $wpdb;
        $t = RS_DB::tablas();

        $rows = $wpdb->get_results( $wpdb->prepare(
            "SELECT r.id, r.titulo, r.fecha, r.hora_inicio, r.hora_fin, r.estado,
                    s.nombre AS sala
             FROM {$t['reservas']} r
             JOIN {$t['salas']} s ON s.id = r.sala_id
             WHERE r.user_id = %d AND r.fecha >= CURDATE()
             ORDER BY r.fecha ASC, r.hora_inicio ASC",
            get_current_user_id()
        ) );

        return rest_ensure_response( $rows );
    }

    /** Cancela una reserva: solo su dueno o un administrador. */
    public static function cancelar( $request ) {
        global $wpdb;
        $t  = RS_DB::tablas();
        $id = absint( $request->get_param( 'id' ) );

        $reserva = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM {$t['reservas']} WHERE id = %d",
            $id
        ) );

        if ( ! $reserva ) {
            return new WP_Error( 'rs_no', 'Reserva no encontrada.', array( 'status' => 404 ) );
        }

        $es_dueno = (int) $reserva->user_id === get_current_user_id();
        if ( ! $es_dueno && ! current_user_can( 'manage_options' ) ) {
            return new WP_Error( 'rs_permiso', 'No puedes cancelar esta reserva.', array( 'status' => 403 ) );
        }

        $wpdb->update(
            $t['reservas'],
            array( 'estado' => 'cancelada' ),
            array( 'id' => $id ),
            array( '%s' ),
            array( '%d' )
        );

        RS_Correos::cancelacion( $id );

        return rest_ensure_response( array( 'ok' => true ) );
    }
}
`;

const correos = `<?php
/**
 * Correos transaccionales con wp_mail(): confirmacion y cancelacion.
 * Plantilla HTML con estilos en linea (compatible con Gmail y Outlook).
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RS_Correos {

    /** Content-type HTML solo mientras dura el envio. */
    public static function content_type_html() {
        return 'text/html; charset=UTF-8';
    }

    public static function confirmacion( $reserva_id ) {
        $datos = self::datos_reserva( $reserva_id );
        if ( ! $datos ) {
            return false;
        }

        $usuario = get_user_by( 'id', $datos->user_id );
        $sitio   = get_bloginfo( 'name' );

        $asunto = sprintf(
            '[%s] Reserva confirmada · %s · %s %s',
            $sitio,
            $datos->sala,
            self::fecha_larga( $datos->fecha ),
            substr( $datos->hora_inicio, 0, 5 )
        );

        $cuerpo = self::plantilla(
            'Reserva confirmada',
            'Hola, ' . $usuario->display_name . '. Tu sala quedo agendada:',
            $datos,
            '#1f7a4d'
        );

        return self::enviar( $datos, $asunto, $cuerpo, true );
    }

    public static function cancelacion( $reserva_id ) {
        $datos = self::datos_reserva( $reserva_id );
        if ( ! $datos ) {
            return false;
        }

        $sitio  = get_bloginfo( 'name' );
        $asunto = sprintf(
            '[%s] Reserva cancelada · %s · %s',
            $sitio,
            $datos->sala,
            self::fecha_larga( $datos->fecha )
        );

        $cuerpo = self::plantilla(
            'Reserva cancelada',
            'La siguiente reserva quedo cancelada y la franja vuelve a estar libre:',
            $datos,
            '#e4572e'
        );

        return self::enviar( $datos, $asunto, $cuerpo, false ); // solo al dueno
    }

    /** Destinatarios y envio via wp_mail(). */
    private static function enviar( $datos, $asunto, $cuerpo, $con_admin = true ) {
        $usuario = get_user_by( 'id', $datos->user_id );
        $para    = array( $usuario->user_email );

        if ( $con_admin && get_option( 'rs_notificar_admin', '1' ) === '1' ) {
            $para[] = get_option( 'admin_email' );
        }

        add_filter( 'wp_mail_content_type', array( __CLASS__, 'content_type_html' ) );
        $ok = wp_mail( $para, $asunto, $cuerpo );
        remove_filter( 'wp_mail_content_type', array( __CLASS__, 'content_type_html' ) );

        return $ok;
    }

    private static function datos_reserva( $reserva_id ) {
        global $wpdb;
        $t = RS_DB::tablas();
        return $wpdb->get_row( $wpdb->prepare(
            "SELECT r.*, s.nombre AS sala, s.ubicacion
             FROM {$t['reservas']} r
             JOIN {$t['salas']} s ON s.id = r.sala_id
             WHERE r.id = %d",
            $reserva_id
        ) );
    }

    private static function fecha_larga( $fecha ) {
        return date_i18n( 'l, j \\d\\e F \\d\\e Y', strtotime( $fecha ) );
    }

    /** Plantilla HTML del correo (tablas + estilos en linea). */
    private static function plantilla( $titulo, $intro, $r, $color ) {
        $usuario = get_user_by( 'id', $r->user_id );
        $sitio   = esc_html( get_bloginfo( 'name' ) );
        $fila    = 'padding:10px 16px;border-bottom:1px solid #e6ebe7;'
                 . 'font-family:Arial,sans-serif;font-size:14px;color:#223129;';

        $html  = '<div style="background:#f2f5f2;padding:32px 16px;">';
        $html .= '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ';
        $html .= 'style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dbe3dc;border-radius:10px;overflow:hidden;">';

        $html .= '<tr><td style="background:' . esc_attr( $color ) . ';padding:22px 24px;">';
        $html .= '<h1 style="margin:0;color:#ffffff;font-family:Arial,sans-serif;font-size:20px;">';
        $html .= esc_html( $titulo ) . '</h1>';
        $html .= '<p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-family:Arial,sans-serif;font-size:13px;">';
        $html .= $sitio . '</p></td></tr>';

        $html .= '<tr><td style="padding:20px 24px 8px;font-family:Arial,sans-serif;font-size:15px;color:#223129;">';
        $html .= esc_html( $intro ) . '</td></tr>';

        $html .= '<tr><td style="padding:8px 24px 16px;">';
        $html .= '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ';
        $html .= 'style="border:1px solid #e6ebe7;border-radius:8px;overflow:hidden;">';

        $html .= '<tr><td style="' . $fila . '"><strong>Sala</strong></td>';
        $html .= '<td style="' . $fila . '">' . esc_html( $r->sala ) . ' · ' . esc_html( $r->ubicacion ) . '</td></tr>';

        $html .= '<tr><td style="' . $fila . '"><strong>Fecha</strong></td>';
        $html .= '<td style="' . $fila . '">' . esc_html( self::fecha_larga( $r->fecha ) ) . '</td></tr>';

        $html .= '<tr><td style="' . $fila . '"><strong>Hora</strong></td>';
        $html .= '<td style="' . $fila . '">' . esc_html( substr( $r->hora_inicio, 0, 5 ) . ' – ' . substr( $r->hora_fin, 0, 5 ) ) . '</td></tr>';

        $html .= '<tr><td style="' . $fila . '"><strong>Reunion</strong></td>';
        $html .= '<td style="' . $fila . '">' . esc_html( $r->titulo ) . '</td></tr>';

        $html .= '<tr><td style="' . $fila . '"><strong>Reservada por</strong></td>';
        $html .= '<td style="' . $fila . '">' . esc_html( $usuario->display_name );
        $html .= ' (' . esc_html( $usuario->user_email ) . ')</td></tr>';

        $html .= '</table></td></tr>';

        $html .= '<tr><td style="padding:0 24px 24px;font-family:Arial,sans-serif;font-size:12px;color:#77877c;">';
        $html .= 'Recibiste este correo porque tienes cuenta en ' . $sitio . '. ';
        $html .= 'Puedes cancelar desde la pestana "Mis reservas" del sitio.</td></tr>';

        $html .= '</table></div>';

        return $html;
    }
}
`;

const admin = `<?php
/**
 * Administracion: gestion de salas, listado de reservas y ajustes.
 * Menu "Salas" en el escritorio de WordPress.
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RS_Admin {

    public static function iniciar() {
        add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
        add_action( 'admin_init', array( __CLASS__, 'registrar_ajustes' ) );
        add_action( 'admin_post_rs_guardar_sala', array( __CLASS__, 'guardar_sala' ) );
        add_action( 'admin_post_rs_borrar_sala', array( __CLASS__, 'borrar_sala' ) );
        add_action( 'admin_post_rs_cancelar', array( __CLASS__, 'cancelar_reserva' ) );
    }

    public static function menu() {
        add_menu_page(
            'Salas de reunion',
            'Salas',
            'manage_options',
            'rs-salas',
            array( __CLASS__, 'pagina_salas' ),
            'dashicons-calendar-alt',
            26
        );
        add_submenu_page( 'rs-salas', 'Todas las salas', 'Salas', 'manage_options', 'rs-salas', array( __CLASS__, 'pagina_salas' ) );
        add_submenu_page( 'rs-salas', 'Reservas', 'Reservas', 'manage_options', 'rs-reservas', array( __CLASS__, 'pagina_reservas' ) );
        add_submenu_page( 'rs-salas', 'Ajustes de reservas', 'Ajustes', 'manage_options', 'rs-ajustes', array( __CLASS__, 'pagina_ajustes' ) );
    }

    public static function registrar_ajustes() {
        register_setting( 'rs_grupo', 'rs_hora_inicio', array( 'sanitize_callback' => array( 'RS_Reservas', 'san_hora' ) ) );
        register_setting( 'rs_grupo', 'rs_hora_fin', array( 'sanitize_callback' => array( 'RS_Reservas', 'san_hora' ) ) );
        register_setting( 'rs_grupo', 'rs_intervalo', array( 'sanitize_callback' => 'absint' ) );
        register_setting( 'rs_grupo', 'rs_notificar_admin' );
    }

    /* ---------------- acciones (admin-post + nonce) ---------------- */

    public static function guardar_sala() {
        self::proteger( 'rs_sala' );
        global $wpdb;

        $datos = array(
            'nombre'    => sanitize_text_field( wp_unslash( $_POST['nombre'] ) ),
            'ubicacion' => sanitize_text_field( wp_unslash( $_POST['ubicacion'] ) ),
            'capacidad' => max( 1, absint( $_POST['capacidad'] ) ),
            'color'     => sanitize_hex_color( wp_unslash( $_POST['color'] ) ) ?: '#1f7a4d',
            'activa'    => isset( $_POST['activa'] ) ? 1 : 0,
        );
        $id = absint( $_POST['sala_id'] );

        if ( $datos['nombre'] === '' ) {
            wp_safe_redirect( admin_url( 'admin.php?page=rs-salas&error=nombre' ) );
            exit;
        }

        if ( $id > 0 ) {
            $wpdb->update( RS_DB::tablas()['salas'], $datos, array( 'id' => $id ) );
        } else {
            $wpdb->insert( RS_DB::tablas()['salas'], $datos );
        }

        wp_safe_redirect( admin_url( 'admin.php?page=rs-salas&guardado=1' ) );
        exit;
    }

    public static function borrar_sala() {
        self::proteger( 'rs_sala' );
        global $wpdb;

        $id = absint( $_POST['sala_id'] );
        $t  = RS_DB::tablas();

        $wpdb->delete( $t['reservas'], array( 'sala_id' => $id ), array( '%d' ) );
        $wpdb->delete( $t['salas'], array( 'id' => $id ), array( '%d' ) );

        wp_safe_redirect( admin_url( 'admin.php?page=rs-salas&borrada=1' ) );
        exit;
    }

    public static function cancelar_reserva() {
        self::proteger( 'rs_cancelar' );
        global $wpdb;

        $id = absint( $_POST['reserva_id'] );

        $wpdb->update(
            RS_DB::tablas()['reservas'],
            array( 'estado' => 'cancelada' ),
            array( 'id' => $id ),
            array( '%s' ),
            array( '%d' )
        );

        RS_Correos::cancelacion( $id );

        wp_safe_redirect( admin_url( 'admin.php?page=rs-reservas&cancelada=1' ) );
        exit;
    }

    /** Capability + nonce, o pantalla de error. */
    private static function proteger( $accion ) {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_die( 'No tienes permisos para hacer eso.' );
        }
        check_admin_referer( $accion, 'rs_nonce' );
    }

    /* ---------------- paginas ---------------- */

    public static function pagina_salas() {
        global $wpdb;
        $t         = RS_DB::tablas();
        $editar    = isset( $_GET['editar'] ) ? absint( $_GET['editar'] ) : 0;
        $sala_edit = $editar ? RS_DB::sala( $editar ) : null;
        $salas     = $wpdb->get_results( "SELECT * FROM {$t['salas']} ORDER BY nombre ASC" );
        $post_url  = esc_url( admin_url( 'admin-post.php' ) );
        ?>
        <div class="wrap">
            <h1>Salas de reunion</h1>

            <?php if ( isset( $_GET['guardado'] ) ) : ?>
                <div class="notice notice-success is-dismissible"><p>Sala guardada correctamente.</p></div>
            <?php endif; ?>
            <?php if ( isset( $_GET['borrada'] ) ) : ?>
                <div class="notice notice-warning is-dismissible"><p>Sala y sus reservas eliminadas.</p></div>
            <?php endif; ?>

            <form method="post" action="<?php echo $post_url; ?>" class="card" style="max-width:640px;">
                <input type="hidden" name="action" value="rs_guardar_sala">
                <input type="hidden" name="sala_id" value="<?php echo esc_attr( $editar ); ?>">
                <?php wp_nonce_field( 'rs_sala', 'rs_nonce' ); ?>

                <h2><?php echo $sala_edit ? 'Editar sala' : 'Nueva sala'; ?></h2>
                <table class="form-table">
                    <tr>
                        <th><label for="rs-nombre">Nombre</label></th>
                        <td><input class="regular-text" id="rs-nombre" name="nombre" required
                                   value="<?php echo esc_attr( $sala_edit ? $sala_edit->nombre : '' ); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="rs-ubicacion">Ubicacion</label></th>
                        <td><input class="regular-text" id="rs-ubicacion" name="ubicacion"
                                   placeholder="Piso 2 · Edificio A"
                                   value="<?php echo esc_attr( $sala_edit ? $sala_edit->ubicacion : '' ); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="rs-capacidad">Capacidad</label></th>
                        <td><input type="number" id="rs-capacidad" name="capacidad" min="1" max="200"
                                   value="<?php echo esc_attr( $sala_edit ? $sala_edit->capacidad : 6 ); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="rs-color">Color</label></th>
                        <td><input type="color" id="rs-color" name="color"
                                   value="<?php echo esc_attr( $sala_edit ? $sala_edit->color : '#1f7a4d' ); ?>"></td>
                    </tr>
                    <tr>
                        <th>Estado</th>
                        <td><label><input type="checkbox" name="activa" value="1"
                            <?php checked( $sala_edit ? (int) $sala_edit->activa : 1, 1 ); ?>> Activa (visible en el widget)</label></td>
                    </tr>
                </table>
                <p class="submit">
                    <button class="button button-primary" type="submit">Guardar sala</button>
                    <?php if ( $editar ) : ?>
                        <a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=rs-salas' ) ); ?>">Cancelar</a>
                    <?php endif; ?>
                </p>
            </form>

            <h2 style="margin-top:32px;">Todas las salas</h2>
            <table class="widefat striped" style="max-width:860px;">
                <thead>
                    <tr><th>Sala</th><th>Ubicacion</th><th>Capacidad</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                <?php foreach ( $salas as $sala ) : ?>
                    <tr>
                        <td>
                            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                                         background:<?php echo esc_attr( $sala->color ); ?>;margin-right:8px;"></span>
                            <?php echo esc_html( $sala->nombre ); ?>
                        </td>
                        <td><?php echo esc_html( $sala->ubicacion ); ?></td>
                        <td><?php echo (int) $sala->capacidad; ?> personas</td>
                        <td><?php echo $sala->activa ? 'Activa' : 'Inactiva'; ?></td>
                        <td>
                            <a href="<?php echo esc_url( admin_url( 'admin.php?page=rs-salas&editar=' . (int) $sala->id ) ); ?>">Editar</a>
                            ·
                            <form method="post" action="<?php echo $post_url; ?>" style="display:inline;"
                                  onsubmit="return confirm('¿Borrar la sala y todas sus reservas?');">
                                <input type="hidden" name="action" value="rs_borrar_sala">
                                <input type="hidden" name="sala_id" value="<?php echo (int) $sala->id; ?>">
                                <?php wp_nonce_field( 'rs_sala', 'rs_nonce' ); ?>
                                <button class="button-link-delete" type="submit">Borrar</button>
                            </form>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public static function pagina_reservas() {
        global $wpdb;
        $t      = RS_DB::tablas();
        $sala_f = isset( $_GET['sala'] ) ? absint( $_GET['sala'] ) : 0;
        $salas  = $wpdb->get_results( "SELECT id, nombre FROM {$t['salas']} ORDER BY nombre ASC" );

        $where = $sala_f ? $wpdb->prepare( ' WHERE r.sala_id = %d', $sala_f ) : '';

        $reservas = $wpdb->get_results(
            "SELECT r.*, s.nombre AS sala, u.display_name AS usuario, u.user_email AS email
             FROM {$t['reservas']} r
             JOIN {$t['salas']} s ON s.id = r.sala_id
             JOIN {$wpdb->users} u ON u.ID = r.user_id
             $where
             ORDER BY r.fecha DESC, r.hora_inicio DESC
             LIMIT 100"
        );
        ?>
        <div class="wrap">
            <h1>Reservas</h1>

            <?php if ( isset( $_GET['cancelada'] ) ) : ?>
                <div class="notice notice-warning is-dismissible"><p>Reserva cancelada y correo enviado.</p></div>
            <?php endif; ?>

            <form method="get" style="margin:16px 0;">
                <input type="hidden" name="page" value="rs-reservas">
                <select name="sala" onchange="this.form.submit()">
                    <option value="0">Todas las salas</option>
                    <?php foreach ( $salas as $sala ) : ?>
                        <option value="<?php echo (int) $sala->id; ?>" <?php selected( $sala_f, (int) $sala->id ); ?>>
                            <?php echo esc_html( $sala->nombre ); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <button class="button" type="submit">Filtrar</button>
            </form>

            <table class="widefat striped" style="max-width:1080px;">
                <thead>
                    <tr>
                        <th>Reunion</th><th>Sala</th><th>Dia</th><th>Hora</th>
                        <th>Usuario</th><th>Estado</th><th></th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ( $reservas as $r ) : ?>
                    <tr>
                        <td><?php echo esc_html( $r->titulo ); ?></td>
                        <td><?php echo esc_html( $r->sala ); ?></td>
                        <td><?php echo esc_html( date_i18n( 'd/m/Y', strtotime( $r->fecha ) ) ); ?></td>
                        <td><?php echo esc_html( substr( $r->hora_inicio, 0, 5 ) . ' – ' . substr( $r->hora_fin, 0, 5 ) ); ?></td>
                        <td><?php echo esc_html( $r->usuario ); ?><br>
                            <small><?php echo esc_html( $r->email ); ?></small></td>
                        <td><?php echo esc_html( ucfirst( $r->estado ) ); ?></td>
                        <td>
                            <?php if ( 'confirmada' === $r->estado ) : ?>
                                <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"
                                      onsubmit="return confirm('¿Cancelar esta reserva?');">
                                    <input type="hidden" name="action" value="rs_cancelar">
                                    <input type="hidden" name="reserva_id" value="<?php echo (int) $r->id; ?>">
                                    <?php wp_nonce_field( 'rs_cancelar', 'rs_nonce' ); ?>
                                    <button class="button" type="submit">Cancelar</button>
                                </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php
    }

    public static function pagina_ajustes() {
        $inicio    = get_option( 'rs_hora_inicio', '08:00' );
        $fin       = get_option( 'rs_hora_fin', '18:00' );
        $intervalo = (int) get_option( 'rs_intervalo', 30 );
        $avisar    = get_option( 'rs_notificar_admin', '1' );
        ?>
        <div class="wrap">
            <h1>Ajustes de reservas</h1>
            <form method="post" action="options.php" class="card" style="max-width:640px;">
                <?php settings_fields( 'rs_grupo' ); ?>
                <table class="form-table">
                    <tr>
                        <th><label for="rs-ini">Apertura del dia</label></th>
                        <td><input type="time" id="rs-ini" name="rs_hora_inicio" value="<?php echo esc_attr( $inicio ); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="rs-fin">Cierre del dia</label></th>
                        <td><input type="time" id="rs-fin" name="rs_hora_fin" value="<?php echo esc_attr( $fin ); ?>"></td>
                    </tr>
                    <tr>
                        <th><label for="rs-int">Duracion de la franja</label></th>
                        <td>
                            <select id="rs-int" name="rs_intervalo">
                                <option value="15" <?php selected( $intervalo, 15 ); ?>>15 minutos</option>
                                <option value="30" <?php selected( $intervalo, 30 ); ?>>30 minutos</option>
                                <option value="60" <?php selected( $intervalo, 60 ); ?>>60 minutos</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Correo al administrador</th>
                        <td>
                            <label>
                                <input type="checkbox" name="rs_notificar_admin" value="1" <?php checked( $avisar, '1' ); ?>>
                                Copiar cada confirmacion a <?php echo esc_html( get_option( 'admin_email' ) ); ?>
                            </label>
                        </td>
                    </tr>
                </table>
                <p class="submit"><button class="button button-primary" type="submit">Guardar cambios</button></p>
            </form>
            <p class="description">El shortcode <code>[reserva_salas]</code> lee estos valores en cada carga.</p>
        </div>
        <?php
    }
}
`;

const shortcode = `<?php
/**
 * Shortcode [reserva_salas] y cola de assets del frontend.
 *
 * Uso:  [reserva_salas]  o  [reserva_salas titulo="Agenda tu sala"]
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class RS_Shortcode {

    public static function iniciar() {
        add_shortcode( 'reserva_salas', array( __CLASS__, 'render' ) );
    }

    public static function render( $atts ) {
        $atts = shortcode_atts( array( 'titulo' => 'Reservar sala' ), $atts, 'reserva_salas' );

        // Sin sesion iniciada: aviso con enlace al login (vuelve a esta pagina).
        if ( ! is_user_logged_in() ) {
            $login = esc_url( wp_login_url( get_permalink() ) );
            return '<div class="rs-aviso-login">'
                 . '<p><strong>Inicia sesion para reservar una sala.</strong></p>'
                 . '<a class="rs-btn rs-btn-primary" href="' . $login . '">Ir al acceso</a>'
                 . '</div>';
        }

        self::encolar();

        ob_start();
        include RS_PATH . 'templates/widget.php';
        return ob_get_clean();
    }

    /** Registra estilos, script y datos para el JS (nonce y usuario incluidos). */
    private static function encolar() {
        wp_enqueue_style( 'reserva-salas', RS_URL . 'assets/css/reserva-salas.css', array(), RS_VERSION );
        wp_enqueue_script( 'reserva-salas', RS_URL . 'assets/js/reserva-salas.js', array(), RS_VERSION, true );

        $usuario = wp_get_current_user();

        wp_localize_script( 'reserva-salas', 'RS_DATA', array(
            'rest'    => esc_url_raw( rest_url( 'reserva-salas/v1' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            'usuario' => array(
                'id'     => $usuario->ID,
                'nombre' => $usuario->display_name,
                'email'  => $usuario->user_email,
            ),
            'horario' => array(
                'inicio'    => get_option( 'rs_hora_inicio', '08:00' ),
                'fin'       => get_option( 'rs_hora_fin', '18:00' ),
                'intervalo' => (int) get_option( 'rs_intervalo', 30 ),
            ),
            'textos'  => array(
                'guardando' => 'Guardando…',
                'enviar'    => 'Confirmar reserva',
            ),
        ) );
    }
}
`;

const widget = `<?php
/**
 * Markup del widget de reservas (lo incluye class-rs-shortcode.php).
 * Toda salida dinamica va escapada con esc_html() / esc_attr().
 * El comportamiento vive en assets/js/reserva-salas.js.
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$usuario = wp_get_current_user();
?>
<div class="rs-app" data-rs-app>

    <header class="rs-cabecera">
        <div>
            <h2 class="rs-titulo"><?php echo esc_html( $atts['titulo'] ); ?></h2>
            <p class="rs-sub">Elige sala, dia y franja. Recibiras un correo de confirmacion.</p>
        </div>
        <div class="rs-usuario">
            <span class="rs-avatar" aria-hidden="true"><?php echo esc_html( mb_substr( $usuario->display_name, 0, 1 ) ); ?></span>
            <span class="rs-usuario-datos">
                <strong><?php echo esc_html( $usuario->display_name ); ?></strong>
                <small><?php echo esc_html( $usuario->user_email ); ?></small>
            </span>
        </div>
    </header>

    <nav class="rs-tabs" role="tablist" aria-label="Secciones de reservas">
        <button type="button" class="rs-tab is-activa" data-rs-tab="nueva" role="tab" aria-selected="true">Nueva reserva</button>
        <button type="button" class="rs-tab" data-rs-tab="mia" role="tab" aria-selected="false">Mis reservas</button>
    </nav>

    <section class="rs-panel" data-rs-panel="nueva">
        <form class="rs-form" data-rs-form>

            <fieldset class="rs-campo">
                <legend>1 · Sala</legend>
                <div class="rs-salas" data-rs-salas><!-- JS pinta las salas --></div>
            </fieldset>

            <div class="rs-fila">
                <label class="rs-campo">
                    <span>2 · Dia</span>
                    <input type="date" data-rs-fecha required>
                </label>
                <label class="rs-campo">
                    <span>Duracion</span>
                    <select data-rs-duracion>
                        <option value="30">30 minutos</option>
                        <option value="60" selected>1 hora</option>
                        <option value="90">1 hora y media</option>
                        <option value="120">2 horas</option>
                    </select>
                </label>
            </div>

            <fieldset class="rs-campo">
                <legend>3 · Franja horaria <small class="rs-leyenda" data-rs-leyenda></small></legend>
                <div class="rs-franjas" data-rs-franjas aria-live="polite"><!-- JS pinta las franjas --></div>
            </fieldset>

            <label class="rs-campo">
                <span>4 · Titulo de la reunion</span>
                <input type="text" data-rs-titulo maxlength="120" placeholder="Ej. Revision de proyecto" required>
            </label>

            <div class="rs-acciones">
                <p class="rs-resumen" data-rs-resumen aria-live="polite">Selecciona una franja libre.</p>
                <button type="submit" class="rs-btn rs-btn-primary" data-rs-enviar>Confirmar reserva</button>
            </div>

            <p class="rs-estado" data-rs-estado role="status"></p>
        </form>
    </section>

    <section class="rs-panel rs-oculto" data-rs-panel="mia">
        <div class="rs-mis-reservas" data-rs-lista><!-- JS pinta la lista --></div>
    </section>

</div>
`;

const jsWidget = `/**
 * Widget de reservas — vanilla JS, sin dependencias.
 * Consume la API REST del plugin; RS_DATA llega via wp_localize_script().
 */
(function () {
    'use strict';

    var app = document.querySelector('[data-rs-app]');
    if (!app) { return; }

    var api = {
        get: function (ruta) {
            return fetch(RS_DATA.rest + ruta, {
                headers: { 'X-WP-Nonce': RS_DATA.nonce }
            }).then(function (r) { return r.json(); });
        },
        post: function (ruta, datos) {
            return fetch(RS_DATA.rest + ruta, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': RS_DATA.nonce
                },
                body: JSON.stringify(datos || {})
            }).then(function (r) { return r.json(); });
        }
    };

    var estado = {
        salas: [],
        sala: null,
        fecha: hoy(),
        duracion: 60,
        ocupadas: [],
        inicio: null
    };

    var el = {
        salas:    app.querySelector('[data-rs-salas]'),
        fecha:    app.querySelector('[data-rs-fecha]'),
        duracion: app.querySelector('[data-rs-duracion]'),
        franjas:  app.querySelector('[data-rs-franjas]'),
        leyenda:  app.querySelector('[data-rs-leyenda]'),
        titulo:   app.querySelector('[data-rs-titulo]'),
        resumen:  app.querySelector('[data-rs-resumen]'),
        enviar:   app.querySelector('[data-rs-enviar]'),
        estado:   app.querySelector('[data-rs-estado]'),
        form:     app.querySelector('[data-rs-form]'),
        lista:    app.querySelector('[data-rs-lista]')
    };

    /* ---------- utilidades ---------- */

    function hoy() {
        var d = new Date();
        var m = ('0' + (d.getMonth() + 1)).slice(-2);
        var dia = ('0' + d.getDate()).slice(-2);
        return d.getFullYear() + '-' + m + '-' + dia;
    }

    function aMinutos(hora) {
        var p = hora.split(':');
        return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    }

    function aHora(min) {
        return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2);
    }

    function mensaje(texto, tipo) {
        el.estado.textContent = texto;
        el.estado.className = 'rs-estado' + (tipo ? ' rs-' + tipo : '');
    }

    /* ---------- salas ---------- */

    function pintarSalas() {
        el.salas.innerHTML = '';
        estado.salas.forEach(function (sala) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rs-sala';
            btn.setAttribute('data-id', sala.id);
            btn.innerHTML =
                '<span class="rs-sala-punto" style="background:' + sala.color + '"></span>' +
                '<span class="rs-sala-nombre">' + sala.nombre + '</span>' +
                '<small>' + sala.capacidad + ' personas · ' + sala.ubicacion + '</small>';
            btn.addEventListener('click', function () { elegirSala(sala); });
            el.salas.appendChild(btn);
        });
        if (estado.salas.length) { elegirSala(estado.salas[0]); }
    }

    function elegirSala(sala) {
        estado.sala = sala;
        estado.inicio = null;
        var botones = el.salas.querySelectorAll('.rs-sala');
        for (var i = 0; i < botones.length; i++) {
            botones[i].classList.toggle('is-elegida', botones[i].getAttribute('data-id') == sala.id);
        }
        cargarDisponibilidad();
    }

    /* ---------- disponibilidad ---------- */

    function cargarDisponibilidad() {
        if (!estado.sala) { return; }
        el.franjas.classList.add('is-cargando');

        api.get('/disponibilidad?sala_id=' + estado.sala.id + '&fecha=' + estado.fecha)
            .then(function (res) {
                estado.ocupadas = res.ocupadas || [];
                pintarFranjas();
                actualizarResumen();
                el.franjas.classList.remove('is-cargando');
            })
            .catch(function () {
                el.franjas.classList.remove('is-cargando');
                mensaje('No se pudo cargar la disponibilidad.', 'error');
            });
    }

    function estaOcupada(min) {
        for (var i = 0; i < estado.ocupadas.length; i++) {
            var o = estado.ocupadas[i];
            if (min >= aMinutos(o.hora_inicio) && min < aMinutos(o.hora_fin)) {
                return true;
            }
        }
        return false;
    }

    function pintarFranjas() {
        el.franjas.innerHTML = '';
        var ini = aMinutos(RS_DATA.horario.inicio);
        var fin = aMinutos(RS_DATA.horario.fin);

        for (var min = ini; min < fin; min += RS_DATA.horario.intervalo) {
            var btn = document.createElement('button');
            btn.type = 'button';
            var libre = !estaOcupada(min);
            btn.className = 'rs-franja ' + (libre ? 'is-libre' : 'is-ocupada');
            btn.textContent = aHora(min);
            btn.setAttribute('data-min', min);

            if (libre) {
                (function (m) {
                    btn.addEventListener('click', function () { elegirFranja(m); });
                })(min);
            } else {
                btn.disabled = true;
                btn.title = 'Franja ocupada';
            }
            el.franjas.appendChild(btn);
        }

        if (el.leyenda) { el.leyenda.textContent = '· ' + estado.fecha; }
    }

    function elegirFranja(min) {
        var paso = RS_DATA.horario.intervalo;

        // Toda la duracion debe caber en franjas libres.
        for (var m = min; m < min + estado.duracion; m += paso) {
            if (estaOcupada(m)) {
                mensaje('La franja de las ' + aHora(min) + ' choca con otra reserva.', 'error');
                return;
            }
        }

        estado.inicio = min;
        var botones = el.franjas.querySelectorAll('.rs-franja');
        for (var i = 0; i < botones.length; i++) {
            var m2 = parseInt(botones[i].getAttribute('data-min'), 10);
            botones[i].classList.toggle('is-mia', m2 >= min && m2 < min + estado.duracion);
        }
        mensaje('');
        actualizarResumen();
    }

    function actualizarResumen() {
        if (!estado.sala || estado.inicio === null) {
            el.resumen.textContent = 'Selecciona una franja libre.';
            return;
        }
        el.resumen.textContent =
            estado.sala.nombre + ' · ' + estado.fecha + ' · ' +
            aHora(estado.inicio) + ' – ' + aHora(estado.inicio + estado.duracion);
    }

    /* ---------- crear reserva ---------- */

    el.form.addEventListener('submit', function (ev) {
        ev.preventDefault();

        if (!estado.sala || estado.inicio === null) {
            mensaje('Elige sala y franja antes de confirmar.', 'error');
            return;
        }

        el.enviar.disabled = true;
        el.enviar.textContent = RS_DATA.textos.guardando;

        api.post('/reservar', {
            sala_id:     estado.sala.id,
            fecha:       estado.fecha,
            hora_inicio: aHora(estado.inicio),
            hora_fin:    aHora(estado.inicio + estado.duracion),
            titulo:      el.titulo.value
        }).then(function (res) {
            el.enviar.disabled = false;
            el.enviar.textContent = RS_DATA.textos.enviar;

            if (res.ok) {
                mensaje('Reserva confirmada. Enviamos el correo a ' + RS_DATA.usuario.email + '.', 'ok');
                estado.inicio = null;
                el.titulo.value = '';
                cargarDisponibilidad();
            } else {
                mensaje(res.message || 'No se pudo crear la reserva.', 'error');
                if (res.code === 'rs_conflicto') { cargarDisponibilidad(); }
            }
        }).catch(function () {
            el.enviar.disabled = false;
            el.enviar.textContent = RS_DATA.textos.enviar;
            mensaje('Fallo de red. Intentalo de nuevo.', 'error');
        });
    });

    /* ---------- mis reservas ---------- */

    function cargarMisReservas() {
        api.get('/mis-reservas').then(function (reservas) {
            el.lista.innerHTML = '';

            if (!reservas.length) {
                el.lista.innerHTML = '<p class="rs-vacia">Todavia no tienes reservas proximas.</p>';
                return;
            }

            reservas.forEach(function (r) {
                var fila = document.createElement('article');
                fila.className = 'rs-reserva';
                fila.innerHTML =
                    '<div class="rs-reserva-datos">' +
                        '<strong>' + r.titulo + '</strong>' +
                        '<small>' + r.sala + ' · ' + r.fecha + ' · ' +
                            r.hora_inicio.slice(0, 5) + ' – ' + r.hora_fin.slice(0, 5) + '</small>' +
                    '</div>';

                if (r.estado === 'confirmada') {
                    var btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'rs-btn rs-btn-mini';
                    btn.setAttribute('data-cancelar', r.id);
                    btn.textContent = 'Cancelar';
                    fila.appendChild(btn);
                } else {
                    fila.innerHTML += '<span class="rs-etiqueta">Cancelada</span>';
                }
                el.lista.appendChild(fila);
            });
        });
    }

    el.lista.addEventListener('click', function (ev) {
        var btn = ev.target.closest ? ev.target.closest('[data-cancelar]') : null;
        if (!btn) { return; }

        btn.disabled = true;
        api.post('/cancelar/' + btn.getAttribute('data-cancelar')).then(function (res) {
            if (res.ok) {
                mensaje('Reserva cancelada. La franja quedo libre.', 'ok');
                cargarMisReservas();
                cargarDisponibilidad();
            }
        });
    });

    /* ---------- pestanas ---------- */

    var tabs = app.querySelectorAll('[data-rs-tab]');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function () {
            var nombre = this.getAttribute('data-rs-tab');
            for (var j = 0; j < tabs.length; j++) {
                var activa = tabs[j] === this;
                tabs[j].classList.toggle('is-activa', activa);
                tabs[j].setAttribute('aria-selected', activa ? 'true' : 'false');
            }
            var paneles = app.querySelectorAll('[data-rs-panel]');
            for (var k = 0; k < paneles.length; k++) {
                paneles[k].classList.toggle('rs-oculto', paneles[k].getAttribute('data-rs-panel') !== nombre);
            }
            if (nombre === 'mia') { cargarMisReservas(); }
        });
    }

    /* ---------- arranque ---------- */

    el.fecha.value = estado.fecha;
    el.fecha.min = estado.fecha;

    el.fecha.addEventListener('change', function () {
        estado.fecha = this.value;
        estado.inicio = null;
        cargarDisponibilidad();
    });

    el.duracion.addEventListener('change', function () {
        estado.duracion = parseInt(this.value, 10);
        estado.inicio = null;
        pintarFranjas();
        actualizarResumen();
    });

    api.get('/salas').then(function (salas) {
        estado.salas = salas;
        pintarSalas();
    });
})();
`;

const cssWidget = `/* ==========================================================================
   Reserva Salas — estilos del widget ([reserva_salas])
   Prefijo .rs- para no chocar con el tema. Variables sobrescribibles:

   --rs-verde, --rs-verde-claro, --rs-rojo, --rs-tinta, --rs-fondo, --rs-radio
   ========================================================================== */

.rs-app {
    --rs-verde: #1f7a4d;
    --rs-verde-claro: #e8f4ed;
    --rs-rojo: #e4572e;
    --rs-tinta: #16251d;
    --rs-gris: #5c6f64;
    --rs-linea: #d8e2d9;
    --rs-fondo: #ffffff;
    --rs-radio: 12px;

    max-width: 760px;
    margin: 0 auto;
    padding: 26px;
    background: var(--rs-fondo);
    border: 1px solid var(--rs-linea);
    border-radius: var(--rs-radio);
    font-family: inherit;
    color: var(--rs-tinta);
    box-shadow: 0 10px 30px rgba(22, 37, 29, 0.07);
}

/* ---------- cabecera ---------- */

.rs-cabecera {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
    padding-bottom: 18px;
    border-bottom: 1px solid var(--rs-linea);
}

.rs-titulo { margin: 0 0 4px; font-size: 1.35rem; }
.rs-sub { margin: 0; color: var(--rs-gris); font-size: 0.9rem; }

.rs-usuario { display: flex; align-items: center; gap: 10px; }

.rs-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: var(--rs-verde);
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 700;
    text-transform: uppercase;
}

.rs-usuario-datos { display: flex; flex-direction: column; line-height: 1.25; }
.rs-usuario-datos small { color: var(--rs-gris); }

/* ---------- pestanas ---------- */

.rs-tabs { display: flex; gap: 8px; margin: 18px 0; }

.rs-tab {
    border: 1px solid var(--rs-linea);
    background: transparent;
    border-radius: 999px;
    padding: 8px 18px;
    font: inherit;
    cursor: pointer;
    color: var(--rs-gris);
    transition: all 0.2s ease;
}

.rs-tab:hover { border-color: var(--rs-verde); color: var(--rs-verde); }

.rs-tab.is-activa {
    background: var(--rs-tinta);
    border-color: var(--rs-tinta);
    color: #fff;
}

/* ---------- campos ---------- */

.rs-campo {
    border: 0;
    margin: 0 0 18px;
    padding: 0;
    display: block;
    width: 100%;
}

.rs-campo > legend,
.rs-campo > span {
    display: block;
    font-weight: 600;
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--rs-gris);
    margin-bottom: 8px;
}

.rs-leyenda { font-weight: 400; text-transform: none; color: var(--rs-gris); }

.rs-fila { display: flex; gap: 14px; flex-wrap: wrap; }

.rs-app input[type="date"],
.rs-app input[type="text"],
.rs-app select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--rs-linea);
    border-radius: 8px;
    font: inherit;
    background: #fff;
    color: var(--rs-tinta);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.rs-app input:focus,
.rs-app select:focus {
    outline: none;
    border-color: var(--rs-verde);
    box-shadow: 0 0 0 3px rgba(31, 122, 77, 0.15);
}

/* ---------- salas ---------- */

.rs-salas { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; }

.rs-sala {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 2px;
    text-align: left;
    padding: 12px 14px;
    border: 1px solid var(--rs-linea);
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    font: inherit;
    transition: all 0.2s ease;
}

.rs-sala:hover { border-color: var(--rs-verde); transform: translateY(-2px); }

.rs-sala.is-elegida {
    border-color: var(--rs-verde);
    background: var(--rs-verde-claro);
    box-shadow: inset 0 0 0 1px var(--rs-verde);
}

.rs-sala-punto {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.rs-sala-nombre { font-weight: 700; }
.rs-sala small { color: var(--rs-gris); font-size: 0.8rem; }

/* ---------- franjas ---------- */

.rs-franjas {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
    gap: 8px;
    transition: opacity 0.2s ease;
}

.rs-franjas.is-cargando { opacity: 0.45; pointer-events: none; }

.rs-franja {
    padding: 9px 4px;
    border-radius: 8px;
    border: 1px solid var(--rs-linea);
    background: #fff;
    font: inherit;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: all 0.15s ease;
}

.rs-franja.is-libre:hover {
    border-color: var(--rs-verde);
    color: var(--rs-verde);
    transform: translateY(-1px);
}

.rs-franja.is-ocupada {
    background: repeating-linear-gradient(
        -45deg,
        #f2f5f2,
        #f2f5f2 5px,
        #e7ece7 5px,
        #e7ece7 10px
    );
    color: #a7b5ab;
    text-decoration: line-through;
    cursor: not-allowed;
}

.rs-franja.is-mia {
    background: var(--rs-verde);
    border-color: var(--rs-verde);
    color: #fff;
    font-weight: 700;
}

/* ---------- acciones ---------- */

.rs-acciones {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 6px;
}

.rs-resumen { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }

.rs-btn {
    border: 0;
    border-radius: 10px;
    padding: 12px 22px;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: all 0.2s ease;
}

.rs-btn-primary { background: var(--rs-verde); color: #fff; }
.rs-btn-primary:hover:not(:disabled) { background: #14532f; transform: translateY(-1px); }
.rs-btn-primary:disabled { opacity: 0.6; cursor: wait; }

.rs-btn-mini { padding: 7px 14px; font-size: 0.85rem; background: #fff; color: var(--rs-rojo); border: 1px solid var(--rs-rojo); }
.rs-btn-mini:hover:not(:disabled) { background: var(--rs-rojo); color: #fff; }

.rs-estado { min-height: 1.3em; margin: 12px 0 0; font-size: 0.9rem; }
.rs-estado.rs-ok { color: var(--rs-verde); font-weight: 600; }
.rs-estado.rs-error { color: var(--rs-rojo); font-weight: 600; }

/* ---------- mis reservas ---------- */

.rs-reserva {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--rs-linea);
    border-radius: 10px;
    margin-bottom: 10px;
}

.rs-reserva-datos { display: flex; flex-direction: column; gap: 2px; }
.rs-reserva-datos small { color: var(--rs-gris); }

.rs-etiqueta {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--rs-rojo);
    border: 1px solid var(--rs-rojo);
    border-radius: 999px;
    padding: 4px 12px;
}

.rs-vacia { color: var(--rs-gris); }

/* ---------- sin sesion ---------- */

.rs-aviso-login {
    max-width: 460px;
    margin: 0 auto;
    padding: 30px;
    text-align: center;
    border: 1px dashed var(--rs-linea);
    border-radius: var(--rs-radio);
    background: #fff;
}

.rs-oculto { display: none; }

@media (max-width: 560px) {
    .rs-app { padding: 18px; }
    .rs-cabecera { flex-direction: column; }
}
`;

export const PLUGIN_FILES: PluginFile[] = [
  {
    path: "reserva-salas.php",
    lang: "php",
    desc: "Archivo principal: cabecera del plugin, constantes, carga de módulos y gancho de activación que crea las tablas.",
    code: main,
  },
  {
    path: "includes/class-rs-db.php",
    lang: "php",
    desc: "Esquema con dbDelta(): wp_rs_salas y wp_rs_reservas, más las consultas de conflicto y disponibilidad (regla de solapamiento de intervalos).",
    code: db,
  },
  {
    path: "includes/class-rs-reservas.php",
    lang: "php",
    desc: "API REST: salas, disponibilidad, reservar, mis reservas y cancelar. permission_callback exige sesión; la reserva re-valida el conflicto en servidor.",
    code: reservas,
  },
  {
    path: "includes/class-rs-correos.php",
    lang: "php",
    desc: "Notificaciones con wp_mail(): plantilla HTML con estilos en línea, confirmación al usuario (y al admin) y aviso de cancelación.",
    code: correos,
  },
  {
    path: "includes/class-rs-admin.php",
    lang: "php",
    desc: "Escritorio de WordPress: CRUD de salas, listado de reservas con filtros y ajustes de horario. Todo protegido con nonce y manage_options.",
    code: admin,
  },
  {
    path: "includes/class-rs-shortcode.php",
    lang: "php",
    desc: "Registra [reserva_salas], encola assets y entrega al JS la URL REST, el nonce wp_rest, el usuario actual y el horario configurado.",
    code: shortcode,
  },
  {
    path: "templates/widget.php",
    lang: "php",
    desc: "HTML del widget con escapes de salida (esc_html/esc_attr): cabecera con usuario, pestañas, selector de sala, franjas y resumen.",
    code: widget,
  },
  {
    path: "assets/js/reserva-salas.js",
    lang: "js",
    desc: "Vanilla JS sin dependencias: pinta salas y franjas desde la API, valida el rango elegido, crea y cancela reservas con fetch + X-WP-Nonce.",
    code: jsWidget,
  },
  {
    path: "assets/css/reserva-salas.css",
    lang: "css",
    desc: "Estilos del widget con prefijo .rs- y variables CSS sobrescribibles por el tema: salas, franjas (libre/ocupada/elegida), pestañas y estados.",
    code: cssWidget,
  },
];

export const totalLineas = PLUGIN_FILES.reduce(
  (acc, f) => acc + f.code.split("\n").length,
  0
);
