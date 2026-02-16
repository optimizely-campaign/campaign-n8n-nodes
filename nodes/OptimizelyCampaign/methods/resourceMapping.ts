import { ILoadOptionsFunctions, ResourceMapperFields } from 'n8n-workflow';
import { isCampaignSystemField, mapApiTypeToN8nType } from '../helpers/utils';
import { BASE_URL, CREDENTIALS_KEY } from './../helpers/constants';
import { IOptimizelyRecipientListField, IOptimizelyRecipientListFieldApiResponse } from '../helpers/types';

async function loadRecipientListFieldsPaged(
	this: ILoadOptionsFunctions,
	clientId: string,
	recipientListId: string,
): Promise<IOptimizelyRecipientListField[]> {
	const out: IOptimizelyRecipientListField[] = [];
	let nextUrl: string | undefined =
		`${BASE_URL}${encodeURIComponent(clientId)}/recipientlists/${recipientListId}/fields?limit=100`;

	while (nextUrl) {
		try {
			const res = (await this.helpers.httpRequestWithAuthentication.call(
				this,
				CREDENTIALS_KEY,
				{ method: 'GET' as const, url: nextUrl, json: true },
			)) as IOptimizelyRecipientListFieldApiResponse;

			out.push(...(res.elements ?? []));
			const nextLink = (res.links ?? []).find((l) => l.rel === 'next');
			nextUrl = nextLink?.href;
		} catch {
			break;
		}
	}

	return out;
}

async function buildMapperFields(
	this: ILoadOptionsFunctions,
	listIdParamName: 'recipientListId' | 'transactionalMailRecipientListId',
	idFieldParamName?: 'recipientIdField' | 'transactionalMailRecipientIdField',
): Promise<ResourceMapperFields> {
	const recipientListId = this.getNodeParameter(listIdParamName, 0) as string;
	if (!recipientListId) return { fields: [] };

	let recipientIdField: string | undefined;
	if (idFieldParamName) {
		recipientIdField = this.getNodeParameter(idFieldParamName, 0) as string;
	}

	try {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };

		const fields: IOptimizelyRecipientListField[] = await loadRecipientListFieldsPaged.call(
			this,
			clientId,
			recipientListId,
		);

		const attributes = fields
			.filter((f) => !isCampaignSystemField(f.internalName))
			.map((f): ResourceMapperFields['fields'][number] => ({
				id: f.internalName,
				displayName: f.displayName,
				required: f.required,
				defaultMatch: recipientIdField ? f.internalName === recipientIdField : false,
				display: true,
				type: mapApiTypeToN8nType(f.type.toString()),
			}));

		return { fields: attributes };
	} catch {
		return { fields: [] };
	}
}

export const resourceMapping = {
	async getCampaignAttributes(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
		return buildMapperFields.call(this, 'recipientListId', 'recipientIdField');
	},

	async getCampaignAttributesForTransactional(
		this: ILoadOptionsFunctions,
	): Promise<ResourceMapperFields> {
		return buildMapperFields.call(
			this,
			'transactionalMailRecipientListId',
			'transactionalMailRecipientIdField',
		);
	},
};
