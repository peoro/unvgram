
import {fetchStatus, getRealPlayerNames, uncolorize} from './unv.js';

async function main() {
	const status = await fetchStatus();
	const players = getRealPlayerNames( status );
	const playerString = players.join(', ') || 'No one';
	
	console.log( `${playerString} playing on ${uncolorize(status.map)} (on ${uncolorize(status.hostname)})` );
}

main().catch( (err)=>{
	console.log( `Couldn't get server status: ${err}` );
});
