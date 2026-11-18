import type { MaskShape } from './viewport-transform';

const NOTCH_RADIUS = 18;
const FRAME_COLOR = '#1a1a1a';
const HOME_COLOR = 'rgba(17,17,17,0.85)';

/**
 * 把遮挡图形换算成内联样式。工作台（React）与注入覆盖层（原生 DOM）共用，
 * 保证两条渲染路径画出的刘海与 Home Indicator 完全一致。
 * 值统一带单位，便于直接赋给 `CSSStyleDeclaration`。
 */
export function maskStyle(shape: MaskShape): Record<string, string> {
  const style: Record<string, string> = {
    position: 'absolute',
    background: shape.kind === 'home' ? HOME_COLOR : FRAME_COLOR,
  };

  const horizontal = shape.edge === 'top' || shape.edge === 'bottom';
  if (horizontal) {
    style.left = '50%';
    style.transform = 'translateX(-50%)';
    style.width = `${shape.length}px`;
    style.height = `${shape.depth}px`;
    style[shape.edge] = `${shape.offset}px`;
  } else {
    style.top = '50%';
    style.transform = 'translateY(-50%)';
    style.height = `${shape.length}px`;
    style.width = `${shape.depth}px`;
    style[shape.edge] = `${shape.offset}px`;
  }

  if (shape.kind === 'home') {
    style.borderRadius = '999px';
    return style;
  }

  const radius = `${NOTCH_RADIUS}px`;
  if (shape.edge === 'top') {
    style.borderBottomLeftRadius = radius;
    style.borderBottomRightRadius = radius;
  } else if (shape.edge === 'bottom') {
    style.borderTopLeftRadius = radius;
    style.borderTopRightRadius = radius;
  } else if (shape.edge === 'left') {
    style.borderTopRightRadius = radius;
    style.borderBottomRightRadius = radius;
  } else {
    style.borderTopLeftRadius = radius;
    style.borderBottomLeftRadius = radius;
  }

  return style;
}
