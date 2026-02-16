// RecipientLists
export enum IOptimizelyRecipientListFieldType {
	STRING,
	TEXT,
	DATE,
	BOOLEAN,
	INTEGER,
	DECIMAL,
	LONG,
}

export interface IOptimizelyRecipientListApiResponse {
	limit: number;
	elements: IOptimizelyRecipientList[];
	count: number;
	links: IOptimizelyApiLink[];
}

export interface IOptimizelyRecipientList {
	id: number;
	name: string;
	recipients: number;
	mediaTypes: string[];
	testList: boolean;
	forTransactionApi: boolean;
	created: string;
	modified: string;
	links: IOptimizelyApiLink[];
}

// SMART CAMPAIGNS //

interface IOptimizelySmartCampaigns {
	id: number;
	name: string;
	mailingGroupId: number;
	status: string;
	type: string;
	created: string;
	modified: string;
	started: string;
	finished: string;
	links: Array<{ rel: string; href: string }>;
}

export interface IOptimizelyCreateSmartCampaignsApiResponse {
	id: number;
	name: string;
	mailingGroupId: number;
	status: string;
	type: string;
	created: string;
	modified: string;
	links: Array<{ rel: string; href: string }>;
	targetGroups: [];
	messages: [];
}

export interface IOptimizelyGetSmartCampaignsApiResponse {
	limit: number;
	elements: IOptimizelySmartCampaigns[];
	count: number;
	links: IOptimizelyApiLink[];
}

export interface IOptimizelyGetSmartCampaignsMailingsApiResponse {
	nodeId: string;
	name: string;
	mailingId: number;
	mediaType: IOptimizelyTransactionalMailMediaType;
	status: string;
	created: string;
	modified: string;
	started: string;
	finished: string;
	subject: object;
	links: Array<{ rel: string; href: string }>;
	gridLocation: { x: number; y: number };
}

// RecipientListsFields
export interface IOptimizelyRecipientListFieldApiResponse {
	limit: number;
	elements: IOptimizelyRecipientListField[];
	count: number;
	links: IOptimizelyApiLink[];
}

export interface IOptimizelyRecipientListField {
	internalName: string;
	displayName: string;
	type: IOptimizelyRecipientListFieldType;
	required: boolean;
}

// OptInProcesses
export interface IOptimizelyOptInProcessesApiResponse {
	limit: number;
	elements: IOptInProcesses[];
	count: number;
	links: IOptimizelyApiLink[];
}

export interface IOptInProcesses {
	id: number;
	name: string;
	description: string;
	type: string;
	confirmationMailingId: number;
	confirmationUrl: string;
	created: string;
	modified: string;
	links: IOptimizelyApiLink[];
}

// TransactionalMails
type IOptimizelyTransactionalMailStatus =
	| 'invalid'
	| 'activationRequired'
	| 'activated'
	| 'canceled'
	| 'paused'
	| 'running'
	| 'finished';

type IOptimizelyTransactionalMailMediaType = 'email' | 'sms' | 'push' | 'print' | string;

export interface IOptimizelyTransactionalMail {
	id: number;
	name: string;
	mailingGroupId: number;
	status: IOptimizelyTransactionalMailStatus;
	type: string;
	created: string;
	modified: string;
	links: IOptimizelyApiLink[];
}

export interface IOptimizelyTransactionalMailsApiResponse {
	limit: number;
	elements: IOptimizelyTransactionalMail[];
	count: number;
	links: IOptimizelyApiLink[];
}

// TransactionalMail
export interface IOptimizelyTransactionalMailDetailsApiResponse extends IOptimizelyTransactionalMail {
	recipientLists: {
		nodeId: string;
		successorNodeId: string;
		recipientListIds: number[];
		links: IOptimizelyApiLink[];
		gridLocation: object;
	};
	targetGroups: string[];
	messages: [];
	message: {
		nodeId: string;
		name: string;
		mailingId: number;
		mediaType: IOptimizelyTransactionalMailMediaType;
		status: IOptimizelyTransactionalMailStatus;
		created: string;
		modified: string;
		senderAddress: string;
		senderName: string;
		replyToAddress: string;
		subject: {
			default: string;
		};
		links: IOptimizelyApiLink[];
		attachmentIds: [];
		gridLocation: object;
	};
}

export interface IOptimizelyApiLink {
	rel: string;
	href: string;
}

export interface IRecipientPollingTriggerStaticData {
	lastCreated?: string;
}

// Webhook

export type IOptimizelyWebhookType =
	| 'open'
	| 'click'
	| 'sent'
	| 'bounce'
	| 'unsubscribe'
	| 'spamcomplaint'
	| 'singleoptin'
	| 'confirmedoptin'
	| 'doubleoptin'
	| 'blocklist'
	| 'archive'
	| 'filteredbyblocklist';

export type IWebhookStatus = 'created' | 'active' | 'inactive' | 'deactivated';

export interface IOptiWebhookAuth {
	type: 'none' | 'basic' | 'oauth2' | string;
}

export interface IOptimizelyGetWebhookApiResponse {
	id: number;
	type: IOptimizelyWebhookType;
	status: IWebhookStatus;
	format: 'json';
	targetUrl: string;
	authentication: IOptiWebhookAuth;
	created: string;
	modified: string;
}

export interface IOptimizelyCreateWebhookResponse {
	id: number;
	webhookId: number;
	type: IOptimizelyWebhookType;
	targetUrl: string;
	status: IWebhookStatus;
	format: string;
}

export interface IOptimizelyVerifyWebhookApiResponse {
	id: number;
	httpStatusCode: number;
	responseBody: string;
	numberOfEvents: number;
	targetUrl: string;
}

export interface IOptimizelyRecipientApiError {
	httpStatusCode: number, // 404 = Recipient Not Found; 200 = OK
	errorMessage: string,
	violations: Array<unknown>
}

export interface IOptimizelyRecipientError {
	context: {
		data: IOptimizelyRecipientApiError;
	};
	httpCode?: number | string;
	message?: string;
	name?: string;
}