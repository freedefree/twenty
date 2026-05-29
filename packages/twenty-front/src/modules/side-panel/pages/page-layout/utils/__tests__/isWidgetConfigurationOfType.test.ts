import { isWidgetConfigurationOfType } from '@/side-panel/pages/page-layout/utils/isWidgetConfigurationOfType';
import { WidgetConfigurationType } from '~/generated-metadata/graphql';
import {
  ALL_CHART_CONFIGURATIONS,
  TEST_BAR_CHART_CONFIGURATION,
  TEST_IFRAME_CONFIGURATION,
  TEST_PIE_CHART_CONFIGURATION,
  TEST_STANDALONE_RICH_TEXT_CONFIGURATION,
} from '~/testing/mock-data/widget-configurations';

describe('isWidgetConfigurationOfType', () => {
  it('returns true when __typename matches', () => {
    expect(
      isWidgetConfigurationOfType(
        TEST_BAR_CHART_CONFIGURATION,
        'BarChartConfiguration',
      ),
    ).toBe(true);
  });

  it('returns true when configurationType matches and __typename is missing', () => {
    expect(
      isWidgetConfigurationOfType(
        {
          configurationType: WidgetConfigurationType.FRONT_COMPONENT,
          frontComponentId: 'front-component-id',
        },
        'FrontComponentConfiguration',
      ),
    ).toBe(true);
  });

  it('returns false when __typename does not match', () => {
    expect(
      isWidgetConfigurationOfType(
        TEST_BAR_CHART_CONFIGURATION,
        'PieChartConfiguration',
      ),
    ).toBe(false);
  });

  it('returns false when configurationType does not match and __typename is missing', () => {
    expect(
      isWidgetConfigurationOfType(
        {
          configurationType: WidgetConfigurationType.IFRAME,
          url: 'https://example.com',
        },
        'FrontComponentConfiguration',
      ),
    ).toBe(false);
  });

  it('returns false for null configuration', () => {
    expect(isWidgetConfigurationOfType(null, 'BarChartConfiguration')).toBe(
      false,
    );
  });

  it('returns false for undefined configuration', () => {
    expect(
      isWidgetConfigurationOfType(undefined, 'BarChartConfiguration'),
    ).toBe(false);
  });

  it('correctly identifies PieChartConfiguration', () => {
    expect(
      isWidgetConfigurationOfType(
        TEST_PIE_CHART_CONFIGURATION,
        'PieChartConfiguration',
      ),
    ).toBe(true);
  });

  it('correctly identifies IframeConfiguration', () => {
    expect(
      isWidgetConfigurationOfType(
        TEST_IFRAME_CONFIGURATION,
        'IframeConfiguration',
      ),
    ).toBe(true);
  });

  it('correctly identifies StandaloneRichTextConfiguration', () => {
    expect(
      isWidgetConfigurationOfType(
        TEST_STANDALONE_RICH_TEXT_CONFIGURATION,
        'StandaloneRichTextConfiguration',
      ),
    ).toBe(true);
  });

  it('works with all chart configuration types', () => {
    ALL_CHART_CONFIGURATIONS.forEach((config) => {
      expect(isWidgetConfigurationOfType(config, config.__typename!)).toBe(
        true,
      );
    });
  });
});
