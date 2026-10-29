/**
 * Prismix Setup Wizard
 *
 * Exposes prismixWizard.* methods to onclick handlers in the wizard markup.
 * prismixWizard.ajaxUrl / nonce / i18n are populated via wp_localize_script.
 */
( function () {
    'use strict';

    var data = window.prismixWizard || { ajaxUrl: '', nonce: '', i18n: {} };

    function prismixGoStep( n ) {
        document.querySelectorAll( '.step' ).forEach( function ( s ) { s.classList.remove( 'active' ); } );
        var target = document.querySelector( '.step[data-step="' + n + '"]' );
        if ( target ) {
            target.classList.add( 'active' );
        }
        var dots = document.querySelectorAll( '.wizard-steps .dot' );
        dots.forEach( function ( d, i ) {
            d.className = 'dot';
            if ( i < n - 1 ) { d.classList.add( 'done' ); }
            if ( i === n - 1 ) { d.classList.add( 'active' ); }
        } );
    }

    function prismixAjax( fd, cb ) {
        fd.append( 'action', 'prismix_setup_action' );
        fd.append( 'nonce', data.nonce );
        fetch( data.ajaxUrl, { method: 'POST', body: fd, credentials: 'same-origin' } )
            .then( function ( r ) { return r.json(); } )
            .then( cb )
            .catch( function () { cb( { success: false } ); } );
    }

    function prismixSaveIdentity() {
        var fd = new FormData();
        fd.append( 'setup_action', 'save_identity' );
        fd.append( 'site_title', document.getElementById( 'wiz-site-title' ).value );
        fd.append( 'site_desc', document.getElementById( 'wiz-site-desc' ).value );
        fd.append( 'site_emoji', document.getElementById( 'wiz-site-emoji' ).value );
        prismixAjax( fd, function () { prismixGoStep( 3 ); } );
    }

    function prismixImportDemo() {
        if ( ! document.getElementById( 'wiz-import-demo' ).checked ) {
            prismixGoStep( 4 );
            return;
        }
        var btn      = document.getElementById( 'btn-import' );
        var bar      = document.getElementById( 'import-bar' );
        var progress = document.getElementById( 'import-progress' );
        var status   = document.getElementById( 'import-status' );

        btn.disabled = true;
        btn.textContent = data.i18n.importing;
        progress.style.display = 'block';
        bar.style.width = '30%';
        status.textContent = data.i18n.creating;

        var fd = new FormData();
        fd.append( 'setup_action', 'import_demo' );
        prismixAjax( fd, function ( res ) {
            bar.style.width = '100%';
            if ( res.success ) {
                var d = res.data;
                status.textContent = ( d.artists || 6 ) + ' artists, ' + ( d.images || 24 ) + ' images imported!';
                setTimeout( function () { prismixGoStep( 4 ); }, 1200 );
            } else {
                status.textContent = res.data || 'Import failed.';
                btn.disabled = false;
                btn.textContent = data.i18n.retry;
            }
        } );
    }

    function prismixSaveNav() {
        var fd = new FormData();
        fd.append( 'setup_action', 'setup_nav' );
        fd.append( 'auth_buttons', document.getElementById( 'wiz-auth-buttons' ).checked ? '1' : '0' );
        prismixAjax( fd, function () {
            var fd2 = new FormData();
            fd2.append( 'setup_action', 'complete' );
            prismixAjax( fd2, function () { prismixGoStep( 5 ); } );
        } );
    }

    // Expose only namespaced methods (no global function pollution).
    window.prismixWizard = Object.assign( data, {
        goStep:        prismixGoStep,
        saveIdentity:  prismixSaveIdentity,
        importDemo:    prismixImportDemo,
        saveNav:       prismixSaveNav
    } );
}() );
