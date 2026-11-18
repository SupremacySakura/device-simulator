import { describe, expect, it } from 'vitest';
import type { DeviceViewport } from '../types/device';
import { maskStyle } from '../utils/mask-style';
import { toMaskShapes } from '../utils/viewport-transform';

function viewport(overrides: Partial<DeviceViewport> = {}): DeviceViewport {
  return {
    width: 393,
    height: 852,
    safeArea: { top: 59, right: 0, bottom: 34, left: 0 },
    screenRadius: 44,
    ...overrides,
  };
}

describe('toMaskShapes', () => {
  it('竖屏：刘海在上，Home Indicator 在下', () => {
    const shapes = toMaskShapes(viewport());
    expect(shapes.map((shape) => [shape.kind, shape.edge])).toEqual([
      ['notch', 'top'],
      ['home', 'bottom'],
    ]);
    expect(shapes[0]?.depth).toBe(59);
    expect(shapes[1]?.depth).toBe(5);
  });

  it('横屏：刘海转到右侧，Home Indicator 转到左侧', () => {
    const shapes = toMaskShapes(
      viewport({
        width: 852,
        height: 393,
        safeArea: { top: 0, right: 59, bottom: 0, left: 34 },
      }),
    );
    expect(shapes.map((shape) => [shape.kind, shape.edge])).toEqual([
      ['notch', 'right'],
      ['home', 'left'],
    ]);
    expect(shapes[0]?.depth).toBe(59);
  });

  it('无安全区设备不产生遮挡', () => {
    const shapes = toMaskShapes(viewport({ safeArea: { top: 0, right: 0, bottom: 0, left: 0 } }));
    expect(shapes).toEqual([]);
  });

  it('只有刘海、没有 Home Indicator 时只画一个图形', () => {
    const shapes = toMaskShapes(viewport({ safeArea: { top: 24, right: 0, bottom: 0, left: 0 } }));
    expect(shapes).toHaveLength(1);
    expect(shapes[0]?.kind).toBe('notch');
  });
});

describe('maskStyle', () => {
  it('横向边缘用 left/top 定位，纵向边缘用 top/left 定位', () => {
    const [notch, home] = toMaskShapes(viewport());
    const notchStyle = maskStyle(notch!);
    expect(notchStyle.left).toBe('50%');
    expect(notchStyle.top).toBe('0px');
    expect(notchStyle.width).toBe(`${notch!.length}px`);

    const homeStyle = maskStyle(home!);
    expect(homeStyle.bottom).toBe(`${home!.offset}px`);
    expect(homeStyle.borderRadius).toBe('999px');
  });

  it('横屏刘海贴右边，宽度等于安全区厚度', () => {
    const shapes = toMaskShapes(
      viewport({
        width: 852,
        height: 393,
        safeArea: { top: 0, right: 59, bottom: 0, left: 34 },
      }),
    );
    const style = maskStyle(shapes[0]!);
    expect(style.right).toBe('0px');
    expect(style.width).toBe('59px');
    expect(style.top).toBe('50%');
    expect(style.borderTopLeftRadius).toBe('18px');
  });
});
