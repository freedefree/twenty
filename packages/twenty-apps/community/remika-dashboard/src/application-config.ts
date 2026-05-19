import { defineApplication } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  DEFAULT_REMIKA_API_BASE_URL,
  REMIKA_API_BASE_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
  REMIKA_ORGANIZATION_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/modules/remika-dashboard/constants';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  icon: 'IconLayoutDashboard',
  applicationVariables: {
    REMIKA_API_BASE_URL: {
      universalIdentifier: REMIKA_API_BASE_URL_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Base URL for the Remika Nuxt app that exposes the dashboard APIs.',
      value: DEFAULT_REMIKA_API_BASE_URL,
      isSecret: false,
    },
    REMIKA_ORGANIZATION_ID: {
      universalIdentifier: REMIKA_ORGANIZATION_ID_VARIABLE_UNIVERSAL_IDENTIFIER,
      description:
        'Optional Remika CRM organization UUID. Leave empty to use the signed-in user default.',
      isSecret: false,
    },
  },
});

