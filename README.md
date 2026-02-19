# n8n-nodes-optimizely-campaign

This package provides **n8n community nodes** for interacting with the **Optimizely Campaign API**.

It enables you to process response data in real time using webhooks, manage recipients, and send transactional emails directly from your n8n workflows.

## Features

- 📡 **Webhook Trigger**
  - Receive and process response data from Optimizely Campaign in real time
  - Ideal for event-driven and reactive workflows

- 👥 **Recipient Management**
  - Create new recipients
  - Update existing recipients
  - Manage recipient data programmatically

- ✉️ **Transactional Emails**
  - Send transactional emails via Optimizely Campaign
  - Integrate email delivery into automated workflows


## Installation

### Community Nodes (self-hosted)

1. Open **Settings → Community Nodes**
2. Click **Install**
3. Enter the package name: `@optimizely-campaign/n8n-nodes-optimizely-campaign`
4. Click **Install**

### Manual Installation (self-hosted)

```bash
npm install @optimizely-campaign/n8n-nodes-optimizely-campaign
```

After installation, restart your n8n instance to load the new nodes.

## Credentials

To use this node, you need **Optimizely Campaign API credentials**. These must be requested from Optimizely Campaign Support.

### How to obtain API credentials:

1. Contact **Optimizely Campaign Support** at [campaignsupport@optimizely.com](mailto:campaignsupport@optimizely.com)
2. Request an **API user** for your Optimizely Campaign account
3. You will receive:
   - **API Username** (API-User)
   - **API Password**
   - **Client ID** (mandator ID)

### Setting up credentials in n8n:

1. In n8n, go to **Credentials** → **New**
2. Search for **Optimizely Campaign API**
3. Enter your credentials:
   - **API-User**: Your API username
   - **Password**: Your API password
   - **Client**: Your Client/Mandator ID
4. Click **Save**

The credentials will be automatically tested by calling the `/users/authenticated` endpoint.

## Compatibility

Tested with:
- n8n version **1.112.0** and later
- Optimizely Campaign API (REST API v1)

## Usage

### Example 1: Create a Recipient

1. Add the **Optimizely Campaign** node to your workflow
2. Select **Recipient** as the resource
3. Select **Create** as the operation
4. Choose your recipient list
5. Select the recipient ID field (usually email)
6. Map your data fields using the Resource Mapper
7. Optionally trigger an opt-in process

### Example 2: Send Transactional Email

1. Add the **Optimizely Campaign** node
2. Select **Transactional Mail** as the resource
3. Choose your transactional mailing
4. Select the recipient list
5. Map recipient data including the ID field
6. Execute to send the email

### Example 3: Webhook Trigger for Campaign Events

1. Add the **Optimizely Campaign Trigger** node
2. Select the event type (e.g., Click, Open, Bounce)
3. The webhook URL will be automatically registered with Optimizely Campaign
4. Process incoming webhook data in your workflow

## Operations

### Recipient Resource

- **Create**: Create a new recipient in a recipient list
- **Get Recipient**: Retrieve recipient data with selected attributes  
- **Update**: Update an existing recipient's data

### Transactional Mail Resource

- **Send**: Send a transactional email to a recipient

### Webhook Trigger

Available events:
- Archive, Blocklist, Bounce, Click, Confirmed Opt-In, Double Opt-In
- Filtered by Blocklist, Open, Sent, Single Opt-In, Spam Complaint, Unsubscribe

## Resources

- [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Optimizely Campaign API Documentation](https://support.optimizely.com/hc/en-us/articles/4413200461197)
- [Optimizely Campaign](https://www.optimizely.com/products/campaign/)
- [GitHub Repository](https://github.com/optimizely-campaign/campaign-n8n-nodes)

## Support

For issues or questions:
- **API Access & Credentials**: Contact [campaignsupport@optimizely.com](mailto:campaignsupport@optimizely.com)
- **General Questions**: Refer to the [Optimizely Campaign Support](https://support.optimizely.com/hc/en-us/categories/4413188107405-Optimizely-Campaign)


## License

[MIT](LICENSE.md)

---

**Developed by:** Optimizely Campaign Integration Management Team
