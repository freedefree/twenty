import { defineApplicationRole } from 'twenty-sdk/define';

import {
  APP_DISPLAY_NAME,
  DEFAULT_APPLICATION_ROLE_UNIVERSAL_IDENTIFIER,
} from 'src/modules/remika-dashboard/constants';

export default defineApplicationRole({
  universalIdentifier: DEFAULT_APPLICATION_ROLE_UNIVERSAL_IDENTIFIER,
  label: `${APP_DISPLAY_NAME} default role`,
  description:
    'Default runtime role for Remika dashboard front components. It does not need Twenty object access.',
  canReadAllObjectRecords: false,
  canUpdateAllObjectRecords: false,
  canSoftDeleteAllObjectRecords: false,
  canDestroyAllObjectRecords: false,
  canUpdateAllSettings: false,
  canBeAssignedToAgents: false,
  canBeAssignedToUsers: false,
  canBeAssignedToApiKeys: false,
});

