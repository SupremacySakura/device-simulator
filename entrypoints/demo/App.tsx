import {
  ArrowRight,
  ChevronRight,
  Heart,
  Home,
  Menu,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

type ProductCategory = '居家' | '数码' | '穿搭';
type Category = '全部' | ProductCategory;
type ProductKind = 'speaker' | 'watch' | 'headphones' | 'lamp' | 'bag' | 'chair';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  kind: ProductKind;
  surface: string;
}

const categories: readonly Category[] = ['全部', '居家', '数码', '穿搭'];

const products: readonly Product[] = [
  {
    id: 'cloud-speaker',
    name: 'Cloud 桌面音箱',
    description: '温润织物与沉浸声场',
    price: 699,
    category: '数码',
    kind: 'speaker',
    surface: '#e7e5e1',
  },
  {
    id: 'loop-watch',
    name: 'Loop 智能腕表',
    description: '轻盈全天候健康陪伴',
    price: 1299,
    category: '数码',
    kind: 'watch',
    surface: '#e4e5e7',
  },
  {
    id: 'air-headphones',
    name: 'Air 头戴耳机',
    description: '安静，留给真正重要的声音',
    price: 899,
    category: '数码',
    kind: 'headphones',
    surface: '#ebe8e3',
  },
  {
    id: 'halo-lamp',
    name: 'Halo 氛围台灯',
    description: '为房间留一束柔和光线',
    price: 329,
    category: '居家',
    kind: 'lamp',
    surface: '#e8ddd1',
  },
  {
    id: 'form-bag',
    name: 'Form 通勤手袋',
    description: '恰到好处的日常容量',
    price: 459,
    category: '穿搭',
    kind: 'bag',
    surface: '#ded8cf',
  },
  {
    id: 'rest-chair',
    name: 'Rest 休闲单椅',
    description: '实木、皮革与舒适弧度',
    price: 2699,
    category: '居家',
    kind: 'chair',
    surface: '#e4ddd5',
  },
];

function HeroArtwork() {
  return (
    <svg
      aria-hidden="true"
      className="hero-artwork"
      viewBox="0 0 720 500"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="demo-wall" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#f4f0e9" />
          <stop offset="1" stopColor="#e7e0d7" />
        </linearGradient>
        <linearGradient id="demo-leather" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#b67849" />
          <stop offset="1" stopColor="#7e4d2e" />
        </linearGradient>
        <filter id="demo-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="18" floodColor="#5d4635" floodOpacity="0.18" stdDeviation="14" />
        </filter>
      </defs>
      <rect width="720" height="500" fill="url(#demo-wall)" />
      <path d="M0 356C185 337 523 345 720 320V500H0Z" fill="#d8d0c6" />
      <path d="M0 378C210 360 497 365 720 340" fill="none" stroke="#c8beb2" strokeWidth="2" />
      <ellipse cx="446" cy="436" rx="196" ry="31" fill="#776250" opacity="0.13" />

      <g transform="translate(90 185)" filter="url(#demo-shadow)">
        <path d="M36 78H134L126 209H48Z" fill="#eeeae4" />
        <ellipse cx="84" cy="75" rx="51" ry="18" fill="#f8f5ef" />
        <path d="M52 71C40 30 45 4 69-21" fill="none" stroke="#6e765f" strokeWidth="5" />
        <path d="M72 69C65 30 80 2 104-19" fill="none" stroke="#78816b" strokeWidth="4" />
        <path d="M54 28C19 12 12-5 17-25C46-17 61 0 54 28Z" fill="#819071" />
        <path d="M68 7C40-15 42-36 54-51C81-34 88-14 68 7Z" fill="#68785d" />
        <path d="M90 22C88-11 105-24 123-29C128-4 117 17 90 22Z" fill="#89977b" />
        <path d="M101 57C111 27 133 20 152 24C145 49 128 62 101 57Z" fill="#718267" />
      </g>

      <g transform="translate(255 92)" filter="url(#demo-shadow)">
        <path d="M85 114L280 82L291 109L95 141Z" fill="#6d4329" />
        <path d="M82 125L102 121L56 357L39 360Z" fill="#573722" />
        <path d="M282 94L301 99L327 334L310 337Z" fill="#573722" />
        <path d="M104 237L287 211L294 239L111 267Z" fill="#70452b" />
        <path
          d="M112 132L273 108C296 104 306 124 297 143L272 203L103 226L87 163C82 146 94 135 112 132Z"
          fill="url(#demo-leather)"
        />
        <path
          d="M129 8L274 0C295-1 307 15 302 34L281 104L106 131L94 39C92 20 105 9 129 8Z"
          fill="url(#demo-leather)"
        />
        <path
          d="M110 128L87 157L53 146"
          fill="none"
          stroke="#5f3a25"
          strokeLinecap="round"
          strokeWidth="14"
        />
        <path
          d="M284 104L310 122L339 106"
          fill="none"
          stroke="#5f3a25"
          strokeLinecap="round"
          strokeWidth="14"
        />
        <path
          d="M207 21C245 17 274 19 283 39L269 95L199 105C183 71 183 44 207 21Z"
          fill="#eee8df"
        />
        <path d="M210 32C239 28 258 30 270 43L260 85L207 93C196 70 196 49 210 32Z" fill="#faf8f4" />
      </g>

      <g transform="translate(576 158)">
        <rect x="0" y="0" width="6" height="190" rx="3" fill="#343536" />
        <path d="M-51 4H57L32-42H-26Z" fill="#303234" />
        <ellipse cx="3" cy="193" rx="53" ry="8" fill="#2e3031" opacity="0.7" />
      </g>
    </svg>
  );
}

function ProductArtwork({ kind }: { kind: ProductKind }) {
  switch (kind) {
    case 'speaker':
      return (
        <svg aria-hidden="true" viewBox="0 0 180 150">
          <ellipse cx="90" cy="124" rx="48" ry="9" fill="#111827" opacity="0.12" />
          <rect x="52" y="33" width="76" height="92" rx="28" fill="#8d8d8a" />
          <ellipse cx="90" cy="35" rx="38" ry="12" fill="#b8b7b2" />
          <path
            d="M64 49V108M73 46V114M82 45V116M91 44V117M100 45V116M109 47V113M118 50V107"
            stroke="#d5d3cd"
            strokeWidth="2"
            opacity="0.7"
          />
          <circle cx="90" cy="35" r="4" fill="#3f4143" />
        </svg>
      );
    case 'watch':
      return (
        <svg aria-hidden="true" viewBox="0 0 180 150">
          <ellipse cx="90" cy="130" rx="42" ry="8" fill="#111827" opacity="0.12" />
          <rect x="70" y="4" width="40" height="142" rx="20" fill="#52565a" />
          <rect
            x="55"
            y="36"
            width="70"
            height="78"
            rx="20"
            fill="#1d2023"
            stroke="#777c80"
            strokeWidth="4"
          />
          <rect x="62" y="43" width="56" height="64" rx="15" fill="#151719" />
          <circle cx="90" cy="75" r="19" fill="none" stroke="#8a8f94" strokeWidth="3" />
          <path d="M90 75V61M90 75L102 83" stroke="#f4f4f1" strokeLinecap="round" strokeWidth="3" />
          <circle cx="128" cy="65" r="4" fill="#44484b" />
        </svg>
      );
    case 'headphones':
      return (
        <svg aria-hidden="true" viewBox="0 0 180 150">
          <ellipse cx="90" cy="130" rx="57" ry="8" fill="#111827" opacity="0.1" />
          <path
            d="M44 79V67C44 35 64 17 90 17C116 17 136 35 136 67V79"
            fill="none"
            stroke="#17191b"
            strokeLinecap="round"
            strokeWidth="13"
          />
          <path
            d="M52 65C54 41 69 29 90 29C111 29 126 41 128 65"
            fill="none"
            stroke="#44474a"
            strokeWidth="4"
          />
          <rect x="33" y="68" width="35" height="62" rx="15" fill="#202225" />
          <rect x="112" y="68" width="35" height="62" rx="15" fill="#202225" />
          <rect x="42" y="78" width="16" height="43" rx="8" fill="#4e5154" />
          <rect x="122" y="78" width="16" height="43" rx="8" fill="#4e5154" />
        </svg>
      );
    case 'lamp':
      return (
        <svg aria-hidden="true" viewBox="0 0 180 150">
          <ellipse cx="92" cy="130" rx="49" ry="8" fill="#5b3d29" opacity="0.13" />
          <path d="M92 62V124" stroke="#4a4038" strokeWidth="6" />
          <path d="M48 61H136L115 20H70Z" fill="#efe1c9" stroke="#c8ab82" strokeWidth="2" />
          <ellipse cx="92" cy="61" rx="44" ry="11" fill="#dcc6a5" />
          <ellipse cx="92" cy="124" rx="42" ry="8" fill="#584b42" />
          <circle cx="92" cy="57" r="18" fill="#ffd886" opacity="0.45" />
        </svg>
      );
    case 'bag':
      return (
        <svg aria-hidden="true" viewBox="0 0 180 150">
          <ellipse cx="90" cy="130" rx="52" ry="8" fill="#3d2d25" opacity="0.12" />
          <path d="M44 51H136L145 128H35Z" fill="#a27a5d" />
          <path
            d="M65 55V42C65 24 76 16 90 16C104 16 115 24 115 42V55"
            fill="none"
            stroke="#76533e"
            strokeWidth="7"
          />
          <path d="M44 52L90 83L136 52" fill="none" stroke="#bd9577" strokeWidth="3" />
          <rect x="82" y="75" width="16" height="18" rx="4" fill="#d4b08e" />
          <path d="M51 63L43 120M129 63L137 120" stroke="#8d674c" strokeWidth="2" />
        </svg>
      );
    case 'chair':
      return (
        <svg aria-hidden="true" viewBox="0 0 180 150">
          <ellipse cx="92" cy="132" rx="65" ry="8" fill="#3d2d25" opacity="0.12" />
          <path d="M48 44L133 31L136 47L50 61Z" fill="#765037" />
          <path d="M49 56L58 130M132 44L144 128" stroke="#523723" strokeWidth="7" />
          <path d="M58 86L129 78L135 101L61 109Z" fill="#9f6946" />
          <path d="M59 108L54 132M130 101L137 132" stroke="#523723" strokeWidth="6" />
          <path d="M75 47L122 40L125 76L72 83Z" fill="#eee7dc" />
          <path d="M76 84L124 79L127 99L78 105Z" fill="#d8cabb" />
        </svg>
      );
  }
}

interface ProductCardProps {
  product: Product;
  onAdd: () => void;
}

function ProductCard({ product, onAdd }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-art" style={{ backgroundColor: product.surface }}>
        <button className="favorite-button" type="button" aria-label={`收藏${product.name}`}>
          <Heart aria-hidden="true" size={18} />
        </button>
        <ProductArtwork kind={product.kind} />
      </div>
      <div className="product-body">
        <p className="product-category">{product.category}</p>
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-meta">
          <strong>¥{product.price.toLocaleString('zh-CN')}</strong>
          <button
            className="add-button"
            type="button"
            onClick={onAdd}
            aria-label={`将${product.name}加入购物袋`}
          >
            <Plus aria-hidden="true" size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('全部');
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const visibleProducts = useMemo(
    () =>
      selectedCategory === '全部'
        ? products
        : products.filter((product) => product.category === selectedCategory),
    [selectedCategory],
  );

  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribed(true);
  };

  return (
    <div className="demo-app">
      <div className="announcement">
        <Sparkles aria-hidden="true" size={13} />
        <span>满 ¥299 免运费 · 30 天无忧退换</span>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Demo Store 首页">
            <span className="brand-mark" aria-hidden="true">
              D
            </span>
            <span>
              <strong>Demo Store</strong>
              <small>DESIGNED FOR DAILY LIFE</small>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="主导航">
            <a href="#new">新品</a>
            <a href="#collections">精选</a>
            <a href="#story">灵感</a>
          </nav>

          <div className="header-actions">
            <button
              className="icon-button"
              type="button"
              aria-label={searchOpen ? '关闭搜索' : '搜索'}
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((open) => !open)}
            >
              {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
            </button>
            <button
              className="icon-button cart-button"
              type="button"
              aria-label={`购物袋，${cartCount} 件商品`}
            >
              <ShoppingBag aria-hidden="true" />
              {cartCount > 0 ? <span className="cart-count">{cartCount}</span> : null}
            </button>
            <button
              className="icon-button menu-button"
              type="button"
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className={`search-panel${searchOpen ? ' is-open' : ''}`}>
          <div className="search-panel-inner">
            <form className="store-search" role="search">
              <Search aria-hidden="true" size={18} />
              <input aria-label="搜索商品" placeholder="搜索音箱、腕表、家具…" type="search" />
              <span>按 Enter 搜索</span>
            </form>
          </div>
        </div>

        <nav className={`mobile-menu${menuOpen ? ' is-open' : ''}`} aria-label="移动端主导航">
          <a href="#new" onClick={() => setMenuOpen(false)}>
            新品到店 <ChevronRight aria-hidden="true" size={18} />
          </a>
          <a href="#collections" onClick={() => setMenuOpen(false)}>
            精选系列 <ChevronRight aria-hidden="true" size={18} />
          </a>
          <a href="#story" onClick={() => setMenuOpen(false)}>
            生活灵感 <ChevronRight aria-hidden="true" size={18} />
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero page-width" id="new">
          <div className="hero-copy">
            <p className="eyebrow">本周精选 · NEW EDIT</p>
            <h1>
              发现精选
              <br />
              好物
            </h1>
            <p className="hero-description">从日常器物到居家灵感，让功能、质感与好设计自然相遇。</p>
            <div className="hero-actions">
              <a className="primary-action" href="#collections">
                立即选购 <ArrowRight aria-hidden="true" size={18} />
              </a>
              <a className="text-action" href="#story">
                浏览故事
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <HeroArtwork />
            <div className="hero-caption">
              <span>01</span>
              <p>
                <strong>REST CHAIR</strong>
                <small>让身体停下来，让思绪继续前行。</small>
              </p>
            </div>
          </div>
        </section>

        <section className="benefits page-width" aria-label="商店服务">
          <div>
            <strong>精选设计</strong>
            <span>只留下值得长久使用的物件</span>
          </div>
          <div>
            <strong>安心配送</strong>
            <span>订单进度透明，包装克制可靠</span>
          </div>
          <div>
            <strong>无忧售后</strong>
            <span>30 天退换与在线设计顾问</span>
          </div>
        </section>

        <section className="collection-section page-width" id="collections">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CURATED GOODS</p>
              <h2>热门推荐</h2>
            </div>
            <a href="#all-products">
              查看全部 <ArrowRight aria-hidden="true" size={17} />
            </a>
          </div>

          <div className="category-tabs" role="tablist" aria-label="商品分类">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={selectedCategory === category}
                className={selectedCategory === category ? 'is-active' : undefined}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="product-grid" id="all-products">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAdd={() => setCartCount((count) => count + 1)}
              />
            ))}
          </div>
        </section>

        <section className="story-section page-width" id="story">
          <article className="story-card story-card-dark">
            <p className="eyebrow">MADE TO LAST</p>
            <h2>少一点，生活反而更丰盛。</h2>
            <p>我们相信真正好的设计无需喧哗，它会在一次次使用中证明自己。</p>
            <a href="#newsletter">
              阅读我们的设计原则 <ArrowRight aria-hidden="true" size={17} />
            </a>
            <div className="story-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </article>

          <article className="story-card story-card-light">
            <div className="material-sample" aria-hidden="true">
              <span className="sample-wood" />
              <span className="sample-fabric" />
              <span className="sample-metal" />
            </div>
            <p className="eyebrow">MATERIAL NOTES</p>
            <h2>关于触感的三种答案</h2>
            <p>实木的纹理、织物的温度，以及金属恰到好处的冷静。</p>
          </article>
        </section>

        <section className="newsletter" id="newsletter">
          <div className="page-width newsletter-inner">
            <div>
              <p className="eyebrow">THE GOOD EDIT</p>
              <h2>偶尔来信，只分享真正的好东西。</h2>
            </div>
            {subscribed ? (
              <p className="subscribe-success" role="status">
                谢谢订阅，下封灵感来信见。
              </p>
            ) : (
              <form onSubmit={handleSubscribe}>
                <label className="sr-only" htmlFor="demo-email">
                  邮箱地址
                </label>
                <input id="demo-email" required type="email" placeholder="你的邮箱地址" />
                <button type="submit" aria-label="订阅灵感来信">
                  <ArrowRight aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="page-width footer-inner">
          <a className="brand footer-brand" href="#top">
            <span className="brand-mark" aria-hidden="true">
              D
            </span>
            <span>
              <strong>Demo Store</strong>
              <small>DESIGNED FOR DAILY LIFE</small>
            </span>
          </a>
          <p>Device Simulator 内置演示页面 · 所有图形均由本地代码绘制</p>
          <div>
            <a href="#top">隐私</a>
            <a href="#top">条款</a>
            <a href="#top">帮助</a>
          </div>
        </div>
      </footer>

      <nav className="bottom-nav" aria-label="底部导航">
        <a className="is-active" href="#top">
          <Home aria-hidden="true" />
          <span>首页</span>
        </a>
        <a href="#collections">
          <Search aria-hidden="true" />
          <span>发现</span>
        </a>
        <a href="#collections">
          <Heart aria-hidden="true" />
          <span>收藏</span>
        </a>
        <a href="#newsletter">
          <UserRound aria-hidden="true" />
          <span>我的</span>
        </a>
      </nav>

      <div className="cart-announcer sr-only" aria-live="polite">
        购物袋中有 {cartCount} 件商品
      </div>
    </div>
  );
}
