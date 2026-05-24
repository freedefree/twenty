export const APP_DISPLAY_NAME = 'Remika Dashboard';
export const APP_DESCRIPTION =
  'Native Twenty dashboard widgets backed by Remika API data, including CRM import and merge flows.';

export const APPLICATION_UNIVERSAL_IDENTIFIER =
  '2df91269-8988-46a0-a759-c7399711b43a';
export const DEFAULT_APPLICATION_ROLE_UNIVERSAL_IDENTIFIER =
  'a7606641-5b8b-48cc-99ab-e646a4a70c16';

export const REMIKA_API_BASE_URL_VARIABLE_UNIVERSAL_IDENTIFIER =
  '5189d3cc-7ab3-4a18-8dbe-1088790ada98';
export const REMIKA_API_PUBLIC_KEY_VARIABLE_UNIVERSAL_IDENTIFIER =
  '9d4b1a3c-9f4c-4be0-bcde-51d8a9f5b201';
export const REMIKA_ORGANIZATION_ID_VARIABLE_UNIVERSAL_IDENTIFIER =
  'c38a3515-7f12-4e72-83f6-5381e99bed76';

export const CRM_CONTACT_ROLE_VALUES = [
  'client',
  'buyer',
  'title',
  'escrow',
  'lender',
  'lawyer',
  'trustee',
  'agent_internal',
  'agent_external',
  'handyman',
  'other',
  'seller',
  'co_buyer',
  'co_seller',
  'notary',
  'contractor',
  'insurance_agent',
  'appraiser',
  'tc',
  'home_inspector',
] as const;

export type CrmContactRoleValue = (typeof CRM_CONTACT_ROLE_VALUES)[number];

export {
  CRM_TWENTY_CONTACT_ROLE_VALUES,
  CRM_CONTACT_ROLE_TO_TWENTY_CONTACT_ROLE_MAP,
  CRM_TWENTY_CONTACT_ROLE_TO_CONTACT_ROLE_MAP,
  toTwentyContactRoleValue,
  fromTwentyContactRoleValue,
} from '../../../../../../../../../shared/crm/contact-role';

export type { CrmTwentyContactRoleValue } from '../../../../../../../../../shared/crm/contact-role';

export const REMIKA_CRM_OVERVIEW_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '1228dfcd-f1e1-4747-a264-3bbafd32770b';
export const REMIKA_MORTGAGE_RATES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '9bcf9bfd-966b-41dc-90e8-45eec13dc108';
export const REMIKA_CONTACT_IMPORT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '3fd3d4a9-3a10-4c17-85ef-7b8fd9f0b5c8';

export const REMIKA_DASHBOARD_TAB_UNIVERSAL_IDENTIFIER =
  '7080f738-4136-4cd0-9dc7-b98db29774fc';
export const REMIKA_CRM_WIDGET_UNIVERSAL_IDENTIFIER =
  '9ef11b67-d381-470c-8c53-8fe6ac35c493';
export const REMIKA_MORTGAGE_WIDGET_UNIVERSAL_IDENTIFIER =
  '04edb32b-af55-4b0e-973f-cf18ca1ae2e9';
export const REMIKA_CONTACT_IMPORT_WIDGET_UNIVERSAL_IDENTIFIER =
  'c6d1d2e1-9b4a-4b3d-9e6f-5f7a3a1b4c12';

export const TWENTY_STANDARD_MY_FIRST_DASHBOARD_LAYOUT_UNIVERSAL_IDENTIFIER =
  '20202020-d001-4d01-8d01-da5ab0a00001';

export const DEFAULT_REMIKA_API_BASE_URL = 'http://localhost:3000';
export const DEFAULT_REMIKA_API_PUBLIC_KEY = 'dev-crm-public-api-key';
