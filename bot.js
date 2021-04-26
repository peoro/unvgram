
import {promises as fs} from 'fs';
import TelegramBot from 'node-telegram-bot-api';
import config from './config.js';
import {fetchStatus, getRealPlayerNames, uncolorize} from './unv.js';

/*
// let's just keep the cache in memory for now...
import {xdgCache} from 'xdg-basedir';

function readCache( path ) {
	return fs.readFile( path, 'utf8' )
		.then( json=>JSON.parse(json) )
		.catch( ()=>({}) );
}
function writeCache( path, obj ) {
	return fs.writeFile( path, JSON.stringify(obj), 'utf8' );
}
*/

let oldPlayers = [];
function shouldNotify( status ) {
	const players = getRealPlayerNames( status );
	return players.length > oldPlayers.length;
}

function formatMessage( status ) {
	const players = getRealPlayerNames( status );
	const playerString = players.join(', ') || 'No one';
	
	return `${playerString} playing on ${uncolorize(status.map)}.`;
}


const bot = new TelegramBot( config.telegram.token, {polling: true} );

function notify( status, chatId=config.telegram.chat, opts={} ) {
	const msg = formatMessage( status );
	bot.sendMessage( chatId, msg, Object.assign({parse_mode:'markdown', disable_notification:true}, opts) );
}
function notifyError( err, chatId=config.telegram.chat, opts={} ) {
	bot.sendMessage( chatId, `Couldn't get server status: ${err}`, Object.assign({parse_mode:'markdown', disable_notification:true}, opts) );
}

bot.onText(/\/status/i, async(msg, match)=>{
	try {
		const status = await fetchStatus();
		oldPlayers = getRealPlayerNames( status );
		notify( status, msg.chat.id, {reply_to_message_id:msg.message_id} );
	} catch( err ) {
		notifyError( err, {reply_to_message_id:msg.message_id} );
	}
});

setInterval( async()=>{
	try {
		const status = await fetchStatus();
		if( shouldNotify(status) ) {
			notify( status );
		}
		
		oldPlayers = getRealPlayerNames( status );
	} catch( err ) {
		console.error( err );
	}
}, config.telegram.pollTime );
