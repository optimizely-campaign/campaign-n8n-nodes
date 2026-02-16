import { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { BASE_URL, CREDENTIALS_KEY } from './../helpers/constants';
import {
	IOptimizelyOptInProcessesApiResponse,
	IOptimizelyRecipientListApiResponse,
	IOptimizelyRecipientListFieldApiResponse,
	IOptimizelyTransactionalMailDetailsApiResponse,
	IOptimizelyTransactionalMailsApiResponse,
} from './../helpers/types';

export const loadOptions = {
	async getRecipientListsInternal(
		this: ILoadOptionsFunctions,
		onlyTransactionalLists = false,
	): Promise<INodePropertyOptions[]> {
		const returnData: INodePropertyOptions[] = [];

		try {
			const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
			let nextUrl: string | undefined =
				`${BASE_URL}${clientId}/recipientlists?includeTestLists=true&sort=created&limit=100`;

			while (nextUrl) {
				const options = { method: 'GET' as const, url: nextUrl, json: true };
				const resp = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIALS_KEY,
					options,
				)) as IOptimizelyRecipientListApiResponse;

				for (const list of resp.elements ?? []) {
					const isTransactional = Boolean(list.forTransactionApi);
					if (!onlyTransactionalLists || isTransactional) {
						returnData.push({ name: list.name, value: String(list.id) });
					}
				}

				const nextLink = (resp.links ?? []).find((l) => l.rel === 'next');
				nextUrl = nextLink?.href;
			}
		} catch {
			return [];
		}
		return returnData;
	},

	async getRecipientLists(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		return await loadOptions.getRecipientListsInternal.call(this, false);
	},

	async getTransactionalRecipientLists(
		this: ILoadOptionsFunctions,
	): Promise<INodePropertyOptions[]> {
		return await loadOptions.getRecipientListsInternal.call(this, true);
	},

	async getRecipientListAttributes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const recipientListId = this.getNodeParameter('recipientListId', 0);
		if (!recipientListId) {
			return [];
		}

		const returnData: INodePropertyOptions[] = [];

		try {
			const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };

			let requestUrl: string | undefined =
				`${BASE_URL}${clientId}/recipientlists/${recipientListId}/fields?limit=100`;

			while (requestUrl) {
				const options = {
					method: 'GET' as const,
					url: requestUrl,
					json: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIALS_KEY,
					options,
				)) as IOptimizelyRecipientListFieldApiResponse;

				const elements = response.elements || [];
				for (const field of elements) {
					returnData.push({
						name: field.displayName,
						value: field.internalName,
					});
				}

				// Check if "nextLink" is in the payload. If so, use it for the next request.
				const nextLink = response.links.find((link) => link.rel === 'next');
				requestUrl = nextLink ? nextLink.href : undefined;
			}
		} catch {
			return [];
		}

		return returnData;
	},

	async getRecipientListIdAttributes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const paramCandidates = ['transactionalMailRecipientListId', 'recipientListId'] as const;

		let recipientListId = '';
		for (const name of paramCandidates) {
			try {
				const val = this.getNodeParameter(name, 0) as string;
				if (val) {
					recipientListId = val;
					break;
				}
			} catch {
				// Parameter not found, continue
			}
		}

		if (!recipientListId) {
			return [];
		}

		const returnData: INodePropertyOptions[] = [];

		try {
			const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };

			let requestUrl: string | undefined =
				`${BASE_URL}${clientId}/recipientlists/${recipientListId}/fields?limit=100`;

			while (requestUrl) {
				const options = {
					method: 'GET' as const,
					url: requestUrl,
					json: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIALS_KEY,
					options,
				)) as IOptimizelyRecipientListFieldApiResponse;

				const elements = response.elements ?? [];
				const idFields = elements.filter((field) => field.required === true);

				for (const field of idFields) {
					returnData.push({
						name: field.displayName,
						value: field.internalName,
					});
				}

				const nextLink = (response.links ?? []).find((l) => l.rel === 'next');
				requestUrl = nextLink?.href;
			}
		} catch {
			return [];
		}

		return returnData;
	},

	async getOptInProcesses(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const optInMailings: INodePropertyOptions[] = [];

		try {
			const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
			let requestUrl: string | undefined =
				`${BASE_URL}${clientId}/optinprocesses?offset=0&limit=100&hasMailing=true`;

			while (requestUrl) {
				const options = {
					method: 'GET' as const,
					url: requestUrl,
					json: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIALS_KEY,
					options,
				)) as IOptimizelyOptInProcessesApiResponse;

				const optInProcesses = response.elements || [];

				for (const optInProcess of optInProcesses) {
					optInMailings.push({
						name: optInProcess.name,
						value: optInProcess.id,
					});
				}

				const nextLink = response.links.find((link) => link.rel === 'next');
				requestUrl = nextLink ? nextLink.href : undefined;
			}
		} catch {
			return [];
		}

		return optInMailings;
	},

	async getTransactionalMails(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
		const returnData: INodePropertyOptions[] = [];

		try {
			const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
			let requestUrl: string | undefined =
				`${BASE_URL}${clientId}/transactionalmail?offset=0&limit=100&resultView=SUMMARY&sort=created&direction=DESC&status=running`;

			while (requestUrl) {
				const options = {
					method: 'GET' as const,
					url: requestUrl,
					json: true,
				};

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					CREDENTIALS_KEY,
					options,
				)) as IOptimizelyTransactionalMailsApiResponse;

				const elements = response.elements || [];
				for (const mail of elements) {
					returnData.push({
						name: mail.name,
						value: String(mail.id),
					});
				}

				// Check if "nextLink" is in the payload. If so, use it for the next request.
				const nextLink = response.links.find((link) => link.rel === 'next');
				requestUrl = nextLink ? nextLink.href : undefined;
			}
		} catch {
			return [];
		}

		return returnData;
	},

	async getTransactionalMailRecipientLists(
		this: ILoadOptionsFunctions,
	): Promise<INodePropertyOptions[]> {
		const transactionalMailId = this.getNodeParameter('transactionalMailId', 0);
		if (!transactionalMailId) {
			return [];
		}

		try {
			const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };

			const requestUrl = `${BASE_URL}${clientId}/transactionalmail/${transactionalMailId}`;
			const options = {
				method: 'GET' as const,
				url: requestUrl,
				json: true,
			};

			const transactionalMailDetails = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				CREDENTIALS_KEY,
				options,
			)) as IOptimizelyTransactionalMailDetailsApiResponse;

			const recipientListIds = transactionalMailDetails.recipientLists.recipientListIds ?? [];
			if (recipientListIds.length === 0) {
				return [];
			}

			const allTransactionalLists = await loadOptions.getTransactionalRecipientLists.call(this);
			const returnData: INodePropertyOptions[] = allTransactionalLists.filter((list) =>
				recipientListIds.includes(Number(list.value)),
			);

			return returnData;
		} catch {
			return [];
		}
	},
};
