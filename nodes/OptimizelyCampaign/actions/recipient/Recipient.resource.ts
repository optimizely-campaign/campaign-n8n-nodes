import { IExecuteFunctions, IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { BASE_URL, CREDENTIALS_KEY } from './../../helpers/constants';
import { IOptimizelyRecipientError } from '../../helpers/types';

export const create = {
	async execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		const updateIfExists = this.getNodeParameter('updateIfExists', i, false) as boolean;
		const recipientListId = this.getNodeParameter('recipientListId', i) as string;
		const recipientIdField = this.getNodeParameter('recipientIdField', i) as string;
		const triggerOptIn = this.getNodeParameter('triggerOptIn', i, false) as boolean;
		const optInProcessId = triggerOptIn
			? (this.getNodeParameter('optInProcess', i, '') as string)
			: undefined;
		const columnsData = this.getNodeParameter('columns', i) as IDataObject;
		const mappedData = columnsData.value as IDataObject;
		const recipientIdValue = mappedData[recipientIdField];

		if (!recipientIdValue) {
			throw new NodeOperationError(this.getNode(), `The Recipient ID field '${recipientIdField}' was not found in the mapped data or is empty.`);
		}

		const params = new URLSearchParams();
		params.set('recipientId', String(recipientIdValue));

		for (const key in mappedData) {
			if (key === recipientIdField) continue;
			const v = mappedData[key];
			if (v === undefined || v === null) continue;
			params.set(`data.${key}`, String(v));
		}

		if (optInProcessId != undefined) params.set("optinProcessId", optInProcessId);

		try {
			const createResponse = await this.helpers.httpRequestWithAuthentication.call(
				this,
				CREDENTIALS_KEY,
				{
					method: 'POST',
					baseURL: `${BASE_URL}${clientId}/`,
					url: `recipients/${recipientListId}`,
					body: params.toString(),
					json: true,
					headers: { 'content-type': 'application/x-www-form-urlencoded' },
				},
			);

			return {
				success: true,
				operation: 'create',
				data: createResponse,
			};
		} catch (error: unknown) {
			const e = error as IOptimizelyRecipientError;
			const api = e.context?.data;
			const status = Number(api.httpStatusCode);

			if (updateIfExists && status === 409) {

				const updateResponse = await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIALS_KEY,
					{
						method: 'POST',
						baseURL: `${BASE_URL}${clientId}/`,
						url: `recipients/${recipientListId}/${encodeURIComponent(String(recipientIdValue))}`,
						body: params.toString(),
						json: true,
						headers: { 'content-type': 'application/x-www-form-urlencoded' },
					},
				);

				return {
					success: true,
					operation: 'update',
					data: updateResponse,
				};
			}

			throw new NodeApiError(this.getNode(), {}, {
				message: 'Create recipient failed',
				description: api ? JSON.stringify(api) : undefined,
			});
		}

	},
};


export const update = {
	async execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		const recipientListId = this.getNodeParameter('recipientListId', i) as string;
		const recipientIdField = this.getNodeParameter('recipientIdField', i) as string;
		const recipientUpdateMode = this.getNodeParameter('recipientUpdateMode', i) as string;

		const columnsData = this.getNodeParameter('columns', i) as IDataObject;
		const mappedData = columnsData.value as IDataObject;
		const recipientIdValue = mappedData[recipientIdField];

		if (!recipientIdValue) {
			throw new NodeOperationError(this.getNode(), `The Recipient ID field '${recipientIdField}' was not found or is empty.`);
		}

		const params = new URLSearchParams();
		params.set('recipientId', String(recipientIdValue));

		if (recipientUpdateMode !== undefined && recipientUpdateMode !== null && recipientUpdateMode !== '') {
			params.set('mode', String(recipientUpdateMode));
		}

		for (const key in mappedData) {
			if (key === recipientIdField) continue;
			const v = mappedData[key];
			if (v === undefined || v === null) continue;
			params.set(`data.${key}`, String(v));
		}

		try {
			const updateResponse = await this.helpers.httpRequestWithAuthentication.call(
				this,
				CREDENTIALS_KEY,
				{
					method: 'POST',
					baseURL: `${BASE_URL}${clientId}/`,
					url: `recipients/${recipientListId}/${encodeURIComponent(String(recipientIdValue))}`,
					body: params.toString(),
					json: true,
					headers: { 'content-type': 'application/x-www-form-urlencoded' },
				},
			);

			return {
				success: true,
				operation: 'update',
				data: updateResponse,
			};
		} catch (error: unknown) {
			const e = error as IOptimizelyRecipientError;
			const api = e.context?.data ?? e.context;

			throw new NodeApiError(this.getNode(), {}, {
				message: 'Recipient update failed',
				description: api ? JSON.stringify(api) : undefined,
			});
		}
	},
};

export const getRecipient = {
	async execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		const recipientListId = this.getNodeParameter('recipientListId', i) as string;
		const recipientId = this.getNodeParameter('recipientId', i) as string;
		const attributeNames = this.getNodeParameter('attributeNames', i, []) as string[];

		if (!recipientId) {
			throw new NodeOperationError(this.getNode(), 'Recipient ID is required');
		}

		const qs: IDataObject = {};
		if (attributeNames.length > 0) {
			qs.attributeNames = attributeNames.join(',');
		}

		const baseURL = `${BASE_URL}${clientId}/`;
		const url = `recipients/${recipientListId}/${encodeURIComponent(recipientId)}`;

		try {
			const response = await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'GET',
				baseURL,
				url,
				qs,
				json: true,
				headers: { accept: 'application/json' },
			});

			return {
				success: true,
				found: true,
				operation: 'getRecipient',
				recipientId,
				data: response as IDataObject,
				status: null
			};
		} catch (e: unknown) {
			const err = e as IOptimizelyRecipientError;

			if (err.context?.data?.httpStatusCode === 404) {
				return {
					success: true,
					found: false,
					operation: 'getRecipient',
					recipientId,
					data: null,
					status: err.context.data,
				};
			}

			throw new NodeApiError(
				this.getNode(),
				{
					message: 'Get recipient failed',
				},
			);
		}
	},
};