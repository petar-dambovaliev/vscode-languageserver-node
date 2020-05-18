/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ----------------------------------------------------------------------------------------- */
import RIL from './ril';

// Install the node runtime abstract.
RIL.install();

import RAL from '../common/ral';
import {
	AbstractMessageReader, DataCallback, AbstractMessageWriter, Message, ReadableStreamMessageReader, WriteableStreamMessageWriter,
	MessageWriterOptions, MessageReaderOptions, MessageReader, MessageWriter, NullLogger, ConnectionStrategy, ConnectionOptions,
	MessageConnection, Logger, createMessageConnection as _createMessageConnection
} from '../common/common';

import * as path from 'path';
import * as os from 'os';
import { ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import { Server, Socket, createServer, createConnection } from 'net';

export * from '../common/common';

export class IPCMessageReader extends AbstractMessageReader {

	private process: NodeJS.Process | ChildProcess;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		let eventEmitter: NodeJS.EventEmitter = this.process;
		eventEmitter.on('error', (error: any) => this.fireError(error));
		eventEmitter.on('close', () => this.fireClose());
	}

	public listen(callback: DataCallback): void {
		(this.process as NodeJS.EventEmitter).on('message', callback);
	}
}

export class IPCMessageWriter extends AbstractMessageWriter {

	private process: NodeJS.Process | ChildProcess;
	private errorCount: number;

	public constructor(process: NodeJS.Process | ChildProcess) {
		super();
		this.process = process;
		this.errorCount = 0;
		let eventEmitter: NodeJS.EventEmitter = this.process;
		eventEmitter.on('error', (error: any) => this.fireError(error));
		eventEmitter.on('close', () => this.fireClose);
	}

	public write(msg: Message): Promise<void> {
		try {
			if (typeof this.process.send === 'function') {
				(this.process.send as Function)(msg, undefined, undefined, (error: any) => {
					if (error) {
						this.errorCount++;
						this.handleError(error, msg);
					} else {
						this.errorCount = 0;
					}
				});
			}
			return Promise.resolve();
		} catch (error) {
			this.handleError(error, msg);
			return Promise.reject(error);
		}
	}

	private handleError(error: any, msg: Message): void {
		this.errorCount++;
		this.fireError(error, msg, this.errorCount);
	}
}

export class SocketMessageReader extends ReadableStreamMessageReader {
	public constructor(socket: Socket, encoding: RAL.MessageBufferEncoding = 'utf-8') {
		super(RIL().stream.asReadableStream(socket), encoding);
	}
}

export class SocketMessageWriter extends WriteableStreamMessageWriter {

	private socket: Socket;

	public constructor(socket: Socket, options?: RAL.MessageBufferEncoding | MessageWriterOptions) {
		super(RIL().stream.asWritableStream(socket), options);
		this.socket = socket;
	}

	public dispose(): void {
		super.dispose();
		this.socket.destroy();
	}
}

export class StreamMessageReader extends ReadableStreamMessageReader {
	public constructor(readble: NodeJS.ReadableStream, encoding?: RAL.MessageBufferEncoding | MessageReaderOptions) {
		super(RIL().stream.asReadableStream(readble), encoding);
	}
}

export class StreamMessageWriter extends WriteableStreamMessageWriter {
	public constructor(writable: NodeJS.WritableStream, options?: RAL.MessageBufferEncoding | MessageWriterOptions) {
		super(RIL().stream.asWritableStream(writable), options);
	}
}

export function generateRandomPipeName(): string {
	const randomSuffix = randomBytes(21).toString('hex');
	if (process.platform === 'win32') {
		return `\\\\.\\pipe\\vscode-jsonrpc-${randomSuffix}-sock`;
	} else {
		// Mac/Unix: use socket file
		return path.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
	}
}

export interface PipeTransport {
	onConnected(): Promise<[MessageReader, MessageWriter]>;
}

export function createClientPipeTransport(pipeName: string, encoding: RAL.MessageBufferEncoding = 'utf-8'): Promise<PipeTransport> {
	let connectResolve: (value: [MessageReader, MessageWriter]) => void;
	const connected = new Promise<[MessageReader, MessageWriter]>((resolve, _reject) => {
		connectResolve = resolve;
	});
	return new Promise<PipeTransport>((resolve, reject) => {
		let server: Server = createServer((socket: Socket) => {
			server.close();
			connectResolve([
				new SocketMessageReader(socket, encoding),
				new SocketMessageWriter(socket, encoding)
			]);
		});
		server.on('error', reject);
		server.listen(pipeName, () => {
			server.removeListener('error', reject);
			resolve({
				onConnected: () => { return connected; }
			});
		});
	});
}

export function createServerPipeTransport(pipeName: string, encoding: RAL.MessageBufferEncoding = 'utf-8'): [MessageReader, MessageWriter] {
	const socket: Socket = createConnection(pipeName);
	return [
		new SocketMessageReader(socket, encoding),
		new SocketMessageWriter(socket, encoding)
	];
}

export interface SocketTransport {
	onConnected(): Promise<[MessageReader, MessageWriter]>;
}

export function createClientSocketTransport(port: number, encoding: RAL.MessageBufferEncoding = 'utf-8'): Promise<SocketTransport> {
	let connectResolve: (value: [MessageReader, MessageWriter]) => void;
	const connected = new Promise<[MessageReader, MessageWriter]>((resolve, _reject) => {
		connectResolve = resolve;
	});
	return new Promise<SocketTransport>((resolve, reject) => {
		const server: Server = createServer((socket: Socket) => {
			server.close();
			connectResolve([
				new SocketMessageReader(socket, encoding),
				new SocketMessageWriter(socket, encoding)
			]);
		});
		server.on('error', reject);
		server.listen(port, '127.0.0.1', () => {
			server.removeListener('error', reject);
			resolve({
				onConnected: () => { return connected; }
			});
		});
	});
}

export function createServerSocketTransport(port: number, encoding: RAL.MessageBufferEncoding = 'utf-8'): [MessageReader, MessageWriter] {
	const socket: Socket = createConnection(port, '127.0.0.1');
	return [
		new SocketMessageReader(socket, encoding),
		new SocketMessageWriter(socket, encoding)
	];
}

function isMessageReader(value: any): value is MessageReader {
	return value.listen !== undefined && value.read === undefined;
}

function isMessageWriter(value: any): value is MessageWriter {
	return value.write !== undefined && value.end === undefined;
}

export function createMessageConnection(reader: MessageReader, writer: MessageWriter, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): MessageConnection;
export function createMessageConnection(inputStream: NodeJS.ReadableStream, outputStream: NodeJS.WritableStream, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): MessageConnection;
export function createMessageConnection(input: MessageReader | NodeJS.ReadableStream, output: MessageWriter | NodeJS.WritableStream, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): MessageConnection {
	if (!logger) {
		logger = NullLogger;
	}
	const reader = isMessageReader(input) ? input : new StreamMessageReader(input);
	const writer = isMessageWriter(output) ? output : new StreamMessageWriter(output);

	if (ConnectionStrategy.is(options)) {
		options = { connectionStrategy: options } as ConnectionOptions;
	}

	return _createMessageConnection(reader, writer, logger, options);
}