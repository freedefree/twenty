import {
  PageLayoutTabLayoutMode,
  definePageLayoutTab,
} from 'twenty-sdk/define';

import {
  REMIKA_PROPERTY_SEARCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  REMIKA_SEARCH_TAB_UNIVERSAL_IDENTIFIER,
  REMIKA_SEARCH_WORKBENCH_WIDGET_UNIVERSAL_IDENTIFIER,
  TWENTY_STANDARD_MY_FIRST_DASHBOARD_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/modules/remika-dashboard/constants';

export default definePageLayoutTab({
  universalIdentifier: REMIKA_SEARCH_TAB_UNIVERSAL_IDENTIFIER,
  pageLayoutUniversalIdentifier:
    TWENTY_STANDARD_MY_FIRST_DASHBOARD_LAYOUT_UNIVERSAL_IDENTIFIER,
  title: 'Search',
  position: 101,
  icon: 'IconSearch',
  layoutMode: PageLayoutTabLayoutMode.CANVAS,
  widgets: [
    {
      universalIdentifier: REMIKA_SEARCH_WORKBENCH_WIDGET_UNIVERSAL_IDENTIFIER,
      title: 'Remika search workspace',
      type: 'FRONT_COMPONENT',
      gridPosition: { row: 0, column: 0, rowSpan: 18, columnSpan: 12 },
      configuration: {
        configurationType: 'FRONT_COMPONENT',
        frontComponentUniversalIdentifier:
          REMIKA_PROPERTY_SEARCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
      },
    },
  ],
});
