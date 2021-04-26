
import {status as rconStatus} from './rcon.js';
import config from './config.js';

export function uncolorize( str ) {
	// is there a simpler way to do this?
	const CARET = '__#CARET#__';
	return str.replaceAll( '^^', CARET ).replace( /\^[0-O]/ig, '' ).replaceAll( CARET, '^' );
}

export function getRealPlayerNames( status ) {
	return status.players.filter( player=>player.address !== 'bot' ).map( player=>uncolorize(player.name) ).sort();
}

export function fetchStatus() {
	return rconStatus( config.unv );
}
