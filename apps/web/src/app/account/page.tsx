import { AccountClient } from './account-client.js';

const apiBaseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:6810';

export default function AccountPage() {
  return <AccountClient apiBaseUrl={apiBaseUrl} />;
}
