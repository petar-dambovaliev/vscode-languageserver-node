/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import {
	Message, NotificationMessage, CancellationToken,
	RequestType0, RequestType, RequestHandler0, RequestHandler, GenericRequestHandler,
	NotificationType0, NotificationType, NotificationHandler0, NotificationHandler, GenericNotificationHandler,
	ProgressType, Trace, Tracer, TraceOptions, Disposable, Event, MessageReader, MessageWriter, Logger, ConnectionStrategy, ConnectionOptions, createMessageConnection
} from 'vscode-jsonrpc';

export interface ProtocolConnection {

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param type The type of request to sent.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<R, E, RO>(type: RequestType0<R, E, RO>, token?: CancellationToken): Promise<R>;

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param type The type of request to sent.
	 * @param params The request's parameter.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, params: P, token?: CancellationToken): Promise<R>;

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param method the request's method name.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<R>(method: string, token?: CancellationToken): Promise<R>;

	/**
	 * Sends a request and returns a promise resolving to the result of the request.
	 *
	 * @param method the request's method name.
	 * @param params The request's parameter.
	 * @param token An optional cancellation token.
	 * @returns A promise resolving to the request's result.
	 */
	sendRequest<R>(method: string, param: any, token?: CancellationToken): Promise<R>;

	/**
	 * Installs a request handler.
	 *
	 * @param type The request type to install the handler for.
	 * @param handler The actual handler.
	 */
	onRequest<R, E, RO>(type: RequestType0<R, E, RO>, handler: RequestHandler0<R, E>): void;

	/**
	 * Installs a request handler.
	 *
	 * @param type The request type to install the handler for.
	 * @param handler The actual handler.
	 */
	onRequest<P, R, E, RO>(type: RequestType<P, R, E, RO>, handler: RequestHandler<P, R, E>): void;

	/**
	 * Installs a request handler.
	 *
	 * @param methods The method name to install the handler for.
	 * @param handler The actual handler.
	 */
	onRequest<R, E>(method: string, handler: GenericRequestHandler<R, E>): void;

	/**
	 * Sends a notification.
	 *
	 * @param type the notification's type to send.
	 */
	sendNotification<RO>(type: NotificationType0<RO>): void;

	/**
	 * Sends a notification.
	 *
	 * @param type the notification's type to send.
	 * @param params the notification's parameters.
	 */
	sendNotification<P, RO>(type: NotificationType<P, RO>, params?: P): void;

	/**
	 * Sends a notification.
	 *
	 * @param method the notification's method name.
	 */
	sendNotification(method: string): void;

	/**
	 * Sends a notification.
	 *
	 * @param method the notification's method name.
	 * @param params the notification's parameters.
	 */
	sendNotification(method: string, params: any): void;

	/**
	 * Installs a notification handler.
	 *
	 * @param type The notification type to install the handler for.
	 * @param handler The actual handler.
	 */
	onNotification<RO>(type: NotificationType0<RO>, handler: NotificationHandler0): void;

	/**
	 * Installs a notification handler.
	 *
	 * @param type The notification type to install the handler for.
	 * @param handler The actual handler.
	 */
	onNotification<P, RO>(type: NotificationType<P, RO>, handler: NotificationHandler<P>): void;

	/**
	 * Installs a notification handler.
	 *
	 * @param methods The method name to install the handler for.
	 * @param handler The actual handler.
	 */
	onNotification(method: string, handler: GenericNotificationHandler): void;

	/**
	 * Installs a progress handler for a given token.
	 * @param type the progress type
	 * @param token the token
	 * @param handler the handler
	 */
	onProgress<P>(type: ProgressType<P>, token: string | number, handler: NotificationHandler<P>): Disposable;

	/**
	 * Sends progress.
	 * @param type the progress type
	 * @param token the token to use
	 * @param value the progress value
	 */
	sendProgress<P>(type: ProgressType<P>, token: string | number, value: P): void;

	/**
	 * Enables tracing mode for the connection.
	 */
	trace(value: Trace, tracer: Tracer, sendNotification?: boolean): void;
	trace(value: Trace, tracer: Tracer, traceOptions?: TraceOptions): void;

	/**
	 * An event emitter firing when an error occurs on the connection.
	 */
	onError: Event<[Error, Message | undefined, number | undefined]>;

	/**
	 * An event emitter firing when the connection got closed.
	 */
	onClose: Event<void>;

	/**
	 * An event emiiter firing when the connection receives a notification that is not
	 * handled.
	 */
	onUnhandledNotification: Event<NotificationMessage>;

	/**
	 * An event emitter firing when the connection got disposed.
	 */
	onDispose: Event<void>;

	/**
	 * Actively disposes the connection.
	 */
	dispose(): void;

	/**
	 * Turns the connection into listening mode
	 */
	listen(): void;
}

export function createProtocolConnection(input: MessageReader, output: MessageWriter, logger?: Logger, options?: ConnectionStrategy | ConnectionOptions): ProtocolConnection {
	if (ConnectionStrategy.is(options)) {
		options = { connectionStrategy: options } as ConnectionOptions;
	}
	return createMessageConnection(input, output, logger, options);
}