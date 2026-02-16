import type {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	IDataObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import {
	IOptimizelyCreateSmartCampaignsApiResponse,
	IOptimizelyGetWebhookApiResponse,
	IOptimizelyWebhookType,
} from './helpers/types';
import { webhookHelpers } from './methods/generalFunctions';
import { CREDENTIALS_KEY } from './helpers/constants';

export class OptimizelyCampaignTrigger implements INodeType {
	description: INodeTypeDescription = {
		usableAsTool: true,
		displayName: 'Optimizely Campaign Trigger',
		name: 'optimizelyCampaignTrigger',
		icon: { light: 'file:../../icons/optimizely.svg', dark: 'file:../../icons/optimizely.dark.svg' },
		group: ['trigger'],
		version: 1,
		description: 'Handle Optimizely Campaign events via webhooks',
		defaults: {
			name: 'Optimizely Campaign Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIALS_KEY, required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'optimizely',
			},
		],

		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'options',
				required: true,
				default: 'open',
				description: 'The events that can trigger the webhook and whether they are enabled',
				options: [
					{
						name: 'Archive',
						value: 'archive',
						description: 'Triggered when a recipient record is archived',
					},
					{
						name: 'Blocklist',
						value: 'blocklist',
						description: 'Triggered when an address is added to the blocklist',
					},
					{
						name: 'Bounce',
						value: 'bounce',
						description: 'Triggered when an email cannot be delivered (soft or hard bounce)',
					},
					{
						name: 'Click',
						value: 'click',
						description: 'Triggered when a recipient clicks a link inside the email',
					},
					{
						name: 'Confirmedoptin',
						value: 'confirmedoptin',
						description: 'Triggered when a recipient confirms their subscription (confirmed opt-in)',
					},
					{
						name: 'Doubleoptin',
						value: 'doubleoptin',
						description: 'Triggered when a recipient completes a double opt-in subscription process',
					},
					{
						name: 'Filtered by Blocklist',
						value: 'filteredbyblocklist',
						description: 'Triggered when an email is suppressed because the address is on the blocklist',
					},
					{
						name: 'Open',
						value: 'open',
						description: 'Triggered when a recipient opens a campaign email',
					},
					{
						name: 'Sent',
						value: 'sent',
						description: 'Triggered when an email has been successfully sent',
					},
					{
						name: 'Singleoptin',
						value: 'singleoptin',
						description: 'Triggered when a recipient signs up using single opt-in',
					},
					{
						name: 'Spamcomplaint',
						value: 'spamcomplaint',
						description: 'Triggered when a recipient marks the email as spam',
					},
					{
						name: 'Unsubscribe',
						value: 'unsubscribe',
						description: 'Triggered when a recipient unsubscribes from the mailing list',
					}
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const nodeData = this.getWorkflowStaticData('node') as IDataObject;
				const targetUrl = this.getNodeWebhookUrl('default');
				const webHook = nodeData.webhook as IOptimizelyGetWebhookApiResponse;
				const apiWebHooks = await webhookHelpers.getWebhooks.call(this);

				if (webHook) {
					const knownWebHook = apiWebHooks.find((hook) => hook.id === webHook.id);
					if (knownWebHook) {
						return true;
					} else {
						const relatedWebHooks = apiWebHooks.filter(
							(hook) =>
								webhookHelpers.getNodeIdFromWebHookUrl(hook.targetUrl) ==
								webhookHelpers.getNodeIdFromWebHookUrl(webHook.targetUrl),
						);
						if (relatedWebHooks) {
							nodeData._staleWebhooks = relatedWebHooks;
						}
						return false;
					}
				} else {
					const relatedWebHooks = apiWebHooks.filter(
						(hook) =>
							webhookHelpers.getNodeIdFromWebHookUrl(hook.targetUrl) ==
							webhookHelpers.getNodeIdFromWebHookUrl(targetUrl || ''),
					);
					if (relatedWebHooks) {
						nodeData._staleWebhooks = relatedWebHooks;
					}
					return false;
				}
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const nodeData = this.getWorkflowStaticData('node') as IDataObject;
				const webhookType = this.getNodeParameter('events') as IOptimizelyWebhookType;
				const targetUrl = this.getNodeWebhookUrl('default') || '';
				let webhook: IOptimizelyGetWebhookApiResponse | undefined;

				// Clean up stale data
				const stale = (nodeData._staleWebhooks as Array<IOptimizelyGetWebhookApiResponse> | undefined) ?? [];
				if (stale.length) {
					for (const hook of stale) {
						try {
							await webhookHelpers.deactivateWebhook.call(this, hook.id);
						} catch (e) { return e }
						try {
							await webhookHelpers.deleteWebhook.call(this, hook.id);
						} catch (e) { return e }
					}
					delete nodeData._staleWebhooks;
				}

				// Create Webhook
				try {
					const response = await webhookHelpers.createWebhook.call(this, webhookType, targetUrl);

					if (!response?.id) {
						throw new NodeApiError(this.getNode(), {
							message: 'Webhook creation failed: Optimizely did not return a webhook ID.',
							description: JSON.stringify(response),
						});
					}

					webhook = response;
				} catch (e) {
					throw new NodeApiError(this.getNode(), e);
				}

				// Aktivwe Webhook
				try {
					await webhookHelpers.activateWebhook.call(this, webhook.id);
				} catch (e) { return e }

				// Safe webhook in nodeData
				nodeData.webhook = webhook;

				// Manual mode logic
				if (this.getMode && this.getMode() === 'manual') {
					const webhookId = webhook.id;

					(async () => {
						let smartCampaign: IOptimizelyCreateSmartCampaignsApiResponse | undefined;
						let testWebhookMailingId: number = 0;
						let isCustomTestMailing: boolean = false;

						try {
							// Fetch Campaign mailing for webhook test
							testWebhookMailingId = await webhookHelpers.getVerifyMailing.call(this);
							// If there is no Campaign mailing availbale, create SmartCampaign + Mailing
							if (testWebhookMailingId === 0) {
								try {
									smartCampaign = await webhookHelpers.createSmartCampaign.call(this);
									if (!smartCampaign.id) {
										throw new NodeApiError(this.getNode(), {
											message: 'Smart Campaign creation failed: Optimizely did not return a campaign ID.',
											description: JSON.stringify(smartCampaign),
										});
									}
								} catch (e) { return e }

								try {
									const mailing = await webhookHelpers.createMailingForSmartCampaign.call(
										this,
										smartCampaign!.id,
									);
									testWebhookMailingId = mailing.mailingId;
									if (!testWebhookMailingId) {
										throw new NodeApiError(this.getNode(), {
											message: 'Mailing creation failed: Optimizely did not return a mailing ID.',
											description: JSON.stringify(mailing),
										});
									}
								} catch (e) { return e }

								if (testWebhookMailingId !== 0) {
									isCustomTestMailing = true;
								}
							}

							// Trigger webhook verification
							try {
								const verifyRes = await webhookHelpers.verifyWebhook.call(
									this,
									webhookId,
									testWebhookMailingId,
								);
								if (verifyRes.httpStatusCode !== 200) {
									throw new NodeApiError(this.getNode(), {
										message: `Verification failed: ${verifyRes}`,
									});
								}
							} catch (e) { return e }

							// Delete test mailing if it is created just for this run.
							if (isCustomTestMailing) {
								try {
									await webhookHelpers.deleteSmartCampaign.call(this, smartCampaign!.id);
								} catch (e) { return e }
							}

							// Clean up manual stuff
							const data = this.getWorkflowStaticData('node') as IDataObject;
							delete data.webhook;
						} catch (e) {
							throw new NodeApiError(this.getNode(), { message: 'Manuel node run failed' + e });
						}

						return true;
					})();
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const nodeData = this.getWorkflowStaticData('node') as IDataObject;
				const webhook = nodeData.webhook as IOptimizelyGetWebhookApiResponse | undefined;
				if (!webhook) return true;

				try {
					await webhookHelpers.deactivateWebhook.call(this, webhook.id);
				} catch (e) {
					return e;
				}

				try {
					await webhookHelpers.deleteWebhook.call(this, webhook.id);
				} catch (e) {
					return e;
				}

				delete nodeData.webhook;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();

		const webhookName = this.getWebhookName();
		if (webhookName === 'setup') {
			// Is a create webhook confirmation request
			const res = this.getResponseObject();
			res.status(200).end();
			return {
				noWebhookResponse: true,
			};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(req.body as IDataObject)],
		};
	}
}
