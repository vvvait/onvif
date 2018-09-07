var  server;

const http = require('http')
	, dgram = require('dgram')
	, fs = require('fs')
	, { Buffer } = require('buffer')
	, { template } = require('dot')
	, reBody = /<s:Body xmlns:xsi="http:\/\/www.w3.org\/2001\/XMLSchema-instance" xmlns:xsd="http:\/\/www.w3.org\/2001\/XMLSchema">(.*)<\/s:Body>/
	, reCommand = /<(\S*) /
	, reNS = /xmlns="http:\/\/www.onvif.org\/\S*\/(\S*)\/wsdl"/
	, __xmldir = __dirname + '/serverMockup/'
	, conf = {
		port: process.env.PORT || 10101,
		hostname: process.env.HOSTNAME || 'localhost',
		pullPointUrl: '/onvif/subscription?Idx=6'
	}
	, listener = (req, res) => {
		const buf = [];
		req.setEncoding('utf8');
		req.on('data', chunk => buf.push(chunk));
		req.on('end', () => {
			let request;
			if (Buffer.isBuffer(buf)) {
				request = Buffer.concat(buf);
			} else {
				request = buf.join('');
			}
			let body = reBody.exec(request);
			if (!body) {
				return res.end();
			}
			body = body[1];
			let command = reCommand.exec(body)[1]
				, ns = reNS.exec(body)[1]
				;
			if (!command) {
				return res.end();
			}
			switch (false) {
				case !fs.existsSync(__xmldir + ns + '.' + command + '.xml'):
					command = ns + '.' + command;
					break;
				case fs.existsSync(__xmldir + command + '.xml'):
					command = 'Error';
			}
			const fileName = __xmldir + command + '.xml';
			res.end(template(fs.readFileSync(fileName))(conf));
		});
	}
	, discover = dgram.createSocket('udp4')
	;

discover.msg = Buffer.from(
	fs.readFileSync(__xmldir + 'Probe.xml')
		.toString()
		.replace('SERVICE_URI', 'http://localhost:' + (process.env.PORT || 10101) + '/onvif/device_service')
);

discover.on('error', err => {
	throw err;
});

discover.on('message', (msg, rinfo) => {
	const msgId = /urn:uuid:([0-9a-f-]+)</.exec(msg.toString())[1];
	if (msgId) {
		switch (msgId) {
			case 'e7707':
				return discover.send(Buffer.from('lollipop'), 0, 8, rinfo.port, rinfo.address);
			case 'd0-61e':
				discover.send(discover.msg, 0, discover.msg.length, rinfo.port, rinfo.address);
				return discover.send(discover.msg, 0, discover.msg.length, rinfo.port, rinfo.address);
			default:
				return discover.send(discover.msg, 0, discover.msg.length, rinfo.port, rinfo.address);
		}
	}
});

discover.bind(3702, () => {
	discover.addMembership('239.255.255.250');
});

server = http.createServer(listener).listen(conf.port);

module.exports = {
	server: server,
	conf: conf
};

