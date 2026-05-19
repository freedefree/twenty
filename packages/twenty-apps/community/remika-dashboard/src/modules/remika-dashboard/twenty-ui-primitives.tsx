import { type CSSProperties } from 'react';

import { THEME } from 'src/modules/remika-dashboard/theme';

type ColorName = 'blue' | 'green' | 'orange' | 'red';

const colorByName: Record<ColorName, string> = {
  blue: THEME.blue,
  green: THEME.green,
  orange: THEME.orange,
  red: THEME.red,
};

const getColor = (color: string) =>
  colorByName[color as ColorName] ?? THEME.blue;

const buttonStyle = (isLoading?: boolean): CSSProperties => ({
  border: `1px solid ${THEME.borderMedium}`,
  borderRadius: THEME.radiusSm,
  background: THEME.bgSecondary,
  color: THEME.fontSecondary,
  cursor: isLoading ? 'default' : 'pointer',
  fontFamily: THEME.fontFamily,
  fontSize: THEME.fontSizeSm,
  fontWeight: THEME.fontWeightMedium,
  height: 24,
  lineHeight: '22px',
  opacity: isLoading ? 0.65 : 1,
  padding: '0 8px',
  whiteSpace: 'nowrap',
});

export const Button = ({
  title,
  isLoading,
  onClick,
}: {
  title: string;
  size?: 'small';
  variant?: 'secondary';
  isLoading?: boolean;
  onClick?: () => void;
}) => (
  <button
    disabled={isLoading}
    onClick={onClick}
    style={buttonStyle(isLoading)}
    type="button"
  >
    {isLoading ? 'Loading...' : title}
  </button>
);

export const Status = ({
  color,
  text,
  weight,
}: {
  color: ColorName | string;
  text: string;
  weight?: 'medium';
}) => {
  const resolvedColor = getColor(color);

  return (
    <span
      style={{
        alignItems: 'center',
        color: THEME.fontSecondary,
        display: 'inline-flex',
        fontSize: THEME.fontSizeSm,
        fontWeight:
          weight === 'medium'
            ? THEME.fontWeightMedium
            : THEME.fontWeightRegular,
        gap: 6,
        minWidth: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          background: resolvedColor,
          borderRadius: 999,
          display: 'inline-block',
          height: 6,
          width: 6,
        }}
      />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text}
      </span>
    </span>
  );
};

export const Tag = ({
  color,
  text,
  weight,
}: {
  color: ColorName | string;
  text: string;
  weight?: 'medium';
}) => {
  const resolvedColor = getColor(color);

  return (
    <span
      style={{
        alignItems: 'center',
        background: THEME.bgTransparentLight,
        border: `1px solid ${resolvedColor}`,
        borderRadius: 999,
        color: resolvedColor,
        display: 'inline-flex',
        fontSize: THEME.fontSizeXs,
        fontWeight:
          weight === 'medium'
            ? THEME.fontWeightMedium
            : THEME.fontWeightRegular,
        height: 20,
        lineHeight: '18px',
        maxWidth: '100%',
        overflow: 'hidden',
        padding: '0 7px',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
};
