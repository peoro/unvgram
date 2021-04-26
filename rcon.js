
import {strict as assert} from 'assert';
import udp from 'dgram';

export function rcon( config, command ) {
	const buffer = Buffer.from( `\xFF\xFF\xFF\xFFrcon ${config.password} ${command}\n`, 'binary' );
	
	const connection = udp.createSocket('udp4');
	
	return new Promise( (resolve, reject)=>{
		let message = "";
		
		const timer = setTimeout( ()=>{
			connection.close();
		}, config.timeout );
		
		connection.on( 'message', (msg, info)=>{
			message += msg.toString('binary');
			timer.refresh();
			
			// NOTE(peoro): this works for `rcon status` only!
			if( message.match(/\n\(end server status\)\n$/) ) {
				connection.close();
			}
		});
		
		connection.on( 'error', (err)=>{
			connection.close();
			reject( err );
		});
		
		connection.on( 'close', ()=>{
			clearTimeout( timer );
			if( ! message ) {
				reject( `No response within ${config.timeout}ms` );
			} else {
				resolve( message );
			}
		});
		
		connection.send( buffer, 0, buffer.length, config.port, config.address, (err)=>{
			if( err ) {
				reject( err );
				connection.close();
			}
		});
	});
}

export async function status( config ) {
	const message = await rcon( config, 'status' );
	const lines = message.split('\n');
	
	let lineIndex = 0;
	const nextLine = ()=>lines[lineIndex++];
	const matchLine = ( re )=>{
		const line = nextLine();
		const match = line.match( re );
		assert( match, `Line ${lineIndex} ("${line}") dosen't match ${re}, in "${message}"` );
		return match.groups;
	};
	
	matchLine( /^....print$/ );
	matchLine( /^\(begin server status\)$/ );
	const {hostname} = matchLine( /^hostname:\s*(?<hostname>.*)$/ );
	const {version} = matchLine( /^version:\s*(?<version>.*)$/ );
	const {protocol} = matchLine( /^protocol:\s*(?<protocol>.*)$/ );
	const {cpu} = matchLine( /^cpu:\s*(?<cpu>\d+)%$/ );
	const time = matchLine( /^time:\s*(?:(?:(?<hh>\d+):)?(?<mm>\d+):)?(?<ss>\d+)$/ );
	const {map} = matchLine( /^map:\s*(?<map>.*)$/ );
	const clients = matchLine( /^players:\s*(?<cur>\d+)\s*\/\s*(?<max>\d+)$/ );
	matchLine( /^num\s+score\s+connection\s+address\s+port\s+name$/ );
	matchLine( /^(-*\s*)*$/ );
	
	const players = [];
	for( let i = 0; i < Number.parseInt(clients.cur); ++i ) {
		const player = matchLine( /^\s*(?<num>\d+)\s*(?<score>-?\d+)\s*(?<connection>\d+)\s*(?<address>\S+)\s*(?<port>\d+)\s*(?<name>.*)$/ );
		players.push( player );
	}
	matchLine( /^\(end server status\)$/ );
	matchLine( /^$/ );
	assert.equal( lineIndex, lines.length, `More lines than expected... Last one is "${nextLine()}"` );
	
	return {hostname, version, protocol, cpu, time, map, clients, players};
}

