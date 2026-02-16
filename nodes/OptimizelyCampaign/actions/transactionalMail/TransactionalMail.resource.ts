import { type IExecuteFunctions, type IDataObject, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { BASE_URL, CREDENTIALS_KEY } from './../../helpers/constants';

export const send = {
	async execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const { client: clientId } = (await this.getCredentials(CREDENTIALS_KEY)) as { client: string };
		const transactionalMailId = this.getNodeParameter('transactionalMailId', i) as string;
		const recipientListId = this.getNodeParameter('transactionalMailRecipientListId', i) as string;
		const recipientIdField = this.getNodeParameter(
			'transactionalMailRecipientIdField',
			i,
		) as string;

		const columnsData = this.getNodeParameter('txnColumns', i) as IDataObject;
		const mappedData = (columnsData?.value || {}) as IDataObject;

		const recipientIdValue = mappedData[recipientIdField];
		if (!recipientIdValue) {
			throw new NodeOperationError(this.getNode(), `The Recipient ID field '${recipientIdField}' was not found in the mapped data or is empty.`);
		}

		const params = new URLSearchParams();
		params.set('recipientListId', String(recipientListId));
		params.set('recipientId', String(recipientIdValue));

		for (const key of Object.keys(mappedData)) {
			if (key === recipientIdField) continue;
			params.set(`data.${key}`, String(mappedData[key]));
		}

		try {
			const response = await this.helpers.httpRequestWithAuthentication.call(
				this,
				CREDENTIALS_KEY,
				{
					method: 'POST' as const,
					baseURL: BASE_URL + clientId,
					url: `/transactionalmail/${transactionalMailId}/send`,
					body: params.toString(),
					json: true,
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
				}
			);

			return {
				success: true,
				operation: 'send',
				data: response,
			};
		} catch (err) {
			throw new NodeApiError(this.getNode(), err);
		}
	},
};
