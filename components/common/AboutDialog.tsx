import {
  Braces,
  Cookie,
  Frame,
  HardDrive,
  MonitorSmartphone,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

function InformationCard({
  icon,
  title,
  children,
  warning = false,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border p-4 ${
        warning ? 'border-[#eee0b8] bg-[#fffcf3]' : 'border-[#e5e5ea] bg-[#fafafd]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${
            warning ? 'bg-[#fff0c7] text-[#996516]' : 'bg-[#efecff] text-[#6547f5]'
          }`}
        >
          {icon}
        </span>
        <h3 className="m-0 text-sm font-semibold text-[#303138]">{title}</h3>
      </div>
      <div className="mt-3 text-sm leading-6 text-[#666872]">{children}</div>
    </section>
  );
}

function DetailItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1 text-[#6547f5]">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Modal
      open={open}
      title="关于 Device Simulator"
      description="面向前端开发者的设备视口与安全区调试工具。"
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          知道了
        </Button>
      }
    >
      <div className="grid gap-4">
        <section className="flex items-center gap-4 rounded-xl border border-[#ddd8fb] bg-[#f8f7ff] p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#6547f5] text-white shadow-[0_8px_24px_rgba(101,71,245,.22)]">
            <MonitorSmartphone aria-hidden="true" className="size-6" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-base font-semibold text-[#292a31]">Device Simulator</h3>
              <span className="rounded-full border border-[#d9d4f5] bg-white px-2 py-0.5 text-[11px] font-medium text-[#6547f5]">
                v1.0.0
              </span>
            </div>
            <p className="mt-1 mb-0 text-xs leading-5 text-[#70727c]">
              使用真实 CSS 视口尺寸预览网页，并可视化安全区、摄像头与屏幕特征。
            </p>
          </div>
        </section>

        <InformationCard
          icon={<Braces aria-hidden="true" className="size-4" />}
          title="核心能力与边界"
        >
          <ul className="m-0 grid list-none gap-2 p-0">
            <DetailItem icon={<Frame aria-hidden="true" className="size-3.5" />}>
              设备宽高使用 CSS 像素建模；画布缩放不会改变 iframe 的真实视口尺寸。
            </DetailItem>
            <DetailItem icon={<MonitorSmartphone aria-hidden="true" className="size-3.5" />}>
              横竖屏分别保存安全区、摄像头与屏幕特征，不依赖简单宽高交换。
            </DetailItem>
            <DetailItem icon={<TriangleAlert aria-hidden="true" className="size-3.5" />}>
              DPR 与 User-Agent 当前主要作为设备资料保存，不能替代真实浏览器或物理设备测试。
            </DetailItem>
          </ul>
        </InformationCard>

        <InformationCard
          icon={<ShieldCheck aria-hidden="true" className="size-4" />}
          title="隐私与最小权限"
        >
          <ul className="m-0 grid list-none gap-2 p-0">
            <DetailItem icon={<HardDrive aria-hidden="true" className="size-3.5" />}>
              自定义设备、设置与历史记录保存在浏览器本地存储中，不会由插件主动上传。
            </DetailItem>
            <DetailItem icon={<ShieldCheck aria-hidden="true" className="size-3.5" />}>
              基础版本仅使用 storage、activeTab 与
              tabs；脚本能力为可选权限，不静默申请所有网站访问权。
            </DetailItem>
          </ul>
        </InformationCard>

        <InformationCard
          warning
          icon={<TriangleAlert aria-hidden="true" className="size-4" />}
          title="iframe 加载限制"
        >
          <p className="m-0">
            部分网站会通过 X-Frame-Options 或 CSP frame-ancestors 禁止嵌入；登录态、第三方 Cookie
            与页面对 window.top 的判断也可能导致加载异常。当前版本不会默认移除目标网站的安全响应头。
          </p>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#ead9aa] bg-white/70 px-3 py-2.5 text-xs leading-5 text-[#755b31]">
            <Cookie aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            <span>
              跨域 iframe 的 DOM 无法直接读取，因此插件不能始终精确区分 CSP
              拦截、登录限制与空白响应。建议优先用于支持 iframe 的本地开发页面。
            </span>
          </div>
        </InformationCard>
      </div>
    </Modal>
  );
}
