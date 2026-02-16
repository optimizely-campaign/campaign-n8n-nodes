import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	NodeApiError,
} from 'n8n-workflow';
import { BASE_URL, CREDENTIALS_KEY, INTEGRATION_ID } from '../helpers/constants';
import {
	IOptimizelyCreateSmartCampaignsApiResponse,
	IOptimizelyGetSmartCampaignsApiResponse,
	IOptimizelyGetSmartCampaignsMailingsApiResponse,
	IOptimizelyGetWebhookApiResponse,
	IOptimizelyVerifyWebhookApiResponse,
	IOptimizelyWebhookType,
} from '../helpers/types';

export const webhookHelpers = {
	/**
	 * Returns a MailingId if exisiting
	 */
	async getVerifyMailing(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	): Promise<number> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };

		let campaigns: IOptimizelyGetSmartCampaignsApiResponse;
		try {
			campaigns = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'GET',
				baseURL: BASE_URL + clientId,
				url: '/smartcampaigns',
				qs: { sort: 'CREATED', direction: 'DESC', offset: 0, limit: 1 },
				headers: { accept: 'application/json' },
				json: true,
			})) as IOptimizelyGetSmartCampaignsApiResponse;
		} catch (error) {
			throw new NodeApiError(this.getNode(), error, { message: 'Failed to fetch Smart Campaigns' });
		}

		if (!campaigns.elements?.length) {
			return 0;
		}

		const smartCampaignId = campaigns.elements[0].id;

		let mailings: IOptimizelyGetSmartCampaignsMailingsApiResponse[];
		try {
			mailings = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'GET',
				baseURL: BASE_URL + clientId,
				url: `/smartcampaigns/${smartCampaignId}/messages`,
				headers: { accept: 'application/json' },
				json: true,
			})) as IOptimizelyGetSmartCampaignsMailingsApiResponse[];
		} catch (error) {
			throw new NodeApiError(this.getNode(), error, { message: `Failed to fetch mailings for Smart Campaign ${smartCampaignId}` });
		}

		if (!mailings.length) {
			return 0;
		}

		return mailings[0].mailingId ?? 0;
	},

	/**
	 * Create a new Smart Campaign
	 */
	async createSmartCampaign(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	): Promise<IOptimizelyCreateSmartCampaignsApiResponse> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };

		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'POST',
				baseURL: BASE_URL + clientId,
				url: '/smartcampaigns',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: {
					name: 'n8n - DO NOT TOUCH',
				},
				json: true,
			})) as IOptimizelyCreateSmartCampaignsApiResponse;

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	/**
	 * Create a new mailing for Smart Campaign
	 */
	async createMailingForSmartCampaign(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		smartCampaignId: number,
	): Promise<IOptimizelyGetSmartCampaignsMailingsApiResponse> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'POST',
				baseURL: BASE_URL + clientId,
				url: `/smartcampaigns/${smartCampaignId}/messages`,
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: {
					name: 'n8n - webhook verification mailing',
					mediaType: 'email',
				},
				json: true,
			})) as IOptimizelyGetSmartCampaignsMailingsApiResponse;

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	/**
	 * Delete a new Smart Campaign
	 */
	async deleteSmartCampaign(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		smartCampaignId: number,
	): Promise<string> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'DELETE',
				baseURL: BASE_URL + clientId,
				url: `/smartcampaigns/${smartCampaignId}`,
				json: true,
			})) as string;

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	/**
	 * Returns all registered webhooks
	 */
	async getWebhooks(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		offset: number = 0,
		limit: number = 100,
	): Promise<Array<IOptimizelyGetWebhookApiResponse>> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				CREDENTIALS_KEY,
				{
					method: 'GET',
					baseURL: BASE_URL + clientId,
					url: '/webhooks',
					qs: {
						sort: 'CREATED',
						direction: 'DESC',
						offset,
						limit,
						integrationId: INTEGRATION_ID,
					},
					headers: { accept: 'application/json' },
					json: true,
				},
			)) as IOptimizelyGetWebhookApiResponse[];

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	/**
	 * Returns the nodeId which is included in the n8n webhook targetUrl
	 */
	getNodeIdFromWebHookUrl(targetUrl: string): string {
		try {
			const url = new URL(targetUrl);
			const excludedValues = new Set(['', ' ', 'webhook', 'webhook-test', 'optimizely']);

			const pathParts = url.pathname
				.split('/')
				.filter((part) => !excludedValues.has(part.toLowerCase()));
			return pathParts.length > 0 ? String(pathParts[0]) : targetUrl;
		} catch {
			return targetUrl;
		}
	},

	/**
	 * Creates a webhook
	 */
	async createWebhook(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		webhookType: IOptimizelyWebhookType,
		targetUrl: string,
	): Promise<IOptimizelyGetWebhookApiResponse> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'POST',
				baseURL: BASE_URL + clientId,
				url: '/webhooks',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: {
					type: webhookType,
					format: 'json',
					targetUrl,
					integrationId: INTEGRATION_ID,
				},
				json: true,
			})) as IOptimizelyGetWebhookApiResponse;

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	/**
	 *
	 */
	async verifyWebhook(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		webHookId: number,
		testWebhookMailingId: number,
	): Promise<IOptimizelyVerifyWebhookApiResponse> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'GET',
				baseURL: BASE_URL + clientId,
				url: `/webhooks/${webHookId}/verify`,
				qs: {
					mailingId: testWebhookMailingId,
					numberOfEvents: 1,
				},
				headers: { accept: 'application/json' },
				json: true,
			})) as IOptimizelyVerifyWebhookApiResponse;

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	async activateWebhook(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		webHookId: number,
	): Promise<IOptimizelyGetWebhookApiResponse> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'POST',
				baseURL: BASE_URL + clientId,
				url: `/webhooks/${webHookId}/activate`,
				json: true,
			})) as IOptimizelyGetWebhookApiResponse;

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	async deactivateWebhook(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		webHookId: number,
	): Promise<IOptimizelyGetWebhookApiResponse> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			const response = (await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'POST',
				baseURL: BASE_URL + clientId,
				url: `/webhooks/${webHookId}/deactivate`,
				json: true,
			})) as IOptimizelyGetWebhookApiResponse;

			return response;
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},

	async deleteWebhook(
		this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
		webHookId: number,
	): Promise<void> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		try {
			await this.helpers.httpRequestWithAuthentication.call(this, CREDENTIALS_KEY, {
				method: 'DELETE',
				baseURL: BASE_URL + clientId,
				url: `/webhooks/${webHookId}`,
				json: true,
			});
		} catch (e) {
			throw new NodeApiError(this.getNode(), e);
		}
	},
};
