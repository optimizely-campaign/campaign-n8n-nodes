import { IExecuteFunctions, INodeExecutionData, IDataObject, NodeOperationError } from 'n8n-workflow';
import * as recipient from './recipient/Recipient.resource';
import * as transactionalMail from './transactionalMail/TransactionalMail.resource';

type OperationHandler = {
	execute: (this: IExecuteFunctions, itemIndex: number) => Promise<IDataObject | IDataObject[]>;
};
type ResourceModule = Record<string, OperationHandler>;

const resources: Record<string, ResourceModule> = {
	recipient,
	transactionalMail,
};

const OP_PARAM = 'operation';

export async function router(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const resource = this.getNodeParameter('resource', i) as keyof typeof resources;
		const operation = this.getNodeParameter(OP_PARAM, i) as string;

		const resourceModule = resources[resource];
		if (!resourceModule) {
			throw new NodeOperationError(this.getNode(), `Unknown resource '${String(resource)}'.`);
		}

		const opHandler = resourceModule[operation];
		if (!opHandler?.execute) {
			const available = Object.keys(resourceModule).sort().join(', ') || '—';
			throw new NodeOperationError(
				this.getNode(),
				`Unknown operation '${operation}' for resource '${String(resource)}'. Available: ${available}`,
			);
		}

		const result = await opHandler.execute.call(this, i);
		const results = Array.isArray(result) ? result : [result];

		for (const item of results) {
			returnData.push({
				json: item,
				pairedItem: { item: i },
			});
		}
	}

	return [returnData];
}
