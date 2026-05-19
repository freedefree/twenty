import {
  PageLayoutTabLayoutMode,
  definePageLayoutTab,
} from 'twenty-sdk/define';

import {
  REMIKA_CRM_OVERVIEW_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  REMIKA_CRM_WIDGET_UNIVERSAL_IDENTIFIER,
  REMIKA_DASHBOARD_TAB_UNIVERSAL_IDENTIFIER,
  REMIKA_MORTGAGE_RATES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  REMIKA_MORTGAGE_WIDGET_UNIVERSAL_IDENTIFIER,
  TWENTY_STANDARD_MY_FIRST_DASHBOARD_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/modules/remika-dashboard/constants';

export default definePageLayoutTab({
  universalIdentifier: REMIKA_DASHBOARD_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier:
    TWENTY_STANDARD_MY_FIRST_DASHBOARD_LAYOUT_UNIVERSAL_IDENTIFIER,
  title: 'Remika',
  position: 100,
  icon: 'IconLayoutDashboard',
  layoutMode: PageLayoutTabLayoutMode.GRID,
  widgets: [
    {
      universalIdentifier: REMIKA_CRM_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'Remika CRM',
      type: 'FRONT_COMPONENT',
      gridPosition: { row: 0, column: 0, rowSpan: 8, columnSpan: 8 },
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          REMIKA_CRM_OVERVIEW_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
    {
      universalIdentifier: REMIKA_MORTGAGE_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'Mortgage rates',
      type: 'FRONT_COMPONENT',
      gridPosition: { row: 0, column: 8, rowSpan: 4, columnSpan: 4 },
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          REMIKA_MORTGAGE_RATES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});

