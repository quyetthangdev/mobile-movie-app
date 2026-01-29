// images/index.ts
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports */
import type { ImageTree } from './types'

export const Images = {
  Auth: {
    LoginBackground: require('./auth/login-background.jpg'),
  },

  Brand: {
    Logo: require('./trend/logo.png'),
    LogoWhite: require('./trend/logo-white.png'),
    LogoIcon: require('./trend/logo-icon.png'),
    HomelandLogo: require('./trend/homeland-logo.png'),
  },

  Flags: {
    US: require('./flag/us-flag.png'),
    VI: require('./flag/vi-flag.png'),
  },

  Food: {
    ProductImage: require('./food/ProductImage.png'),
    NewProductIcon: require('./food/new-product-icon.png'),
  },

  Landing: {
    Desktop: require('./landing/landing-page-background.webp'),
    Mobile: require('./landing/landing-page-background-mobile.jpg'),
  },

  News: {
    Article11: require('./news/news_article_1_1.jpg'),
    Article12: require('./news/news_article_1_2.jpg'),
    Article13: require('./news/news_article_1_3.jpg'),
    Article21: require('./news/news_article_2_1.jpg'),
    Article22: require('./news/news_article_2_2.jpg'),
    Article23: require('./news/news_article_2_3.jpg'),
    Article31: require('./news/news_article_3_1.jpg'),
    Article32: require('./news/news_article_3_2.jpg'),
    Article33: require('./news/news_article_3_3.jpg'),
    Article34: require('./news/news_article_3_4.jpg'),
  },

  Highlight: {
    Menu2: require('./highlight/highlight_menu_2.png'),
    Menu3: require('./highlight/highlight_menu_3.png'),
    Menu4: require('./highlight/highlight_menu_4.png'),
    Menu5: require('./highlight/highlight_menu_5.png'),
  },

  Featured: {
    Services1: require('./highlight/featured-services-1.png'),
    Services2: require('./highlight/featured-services-2.png'),
    Services3: require('./highlight/featured_service_3.jpg'),
    Services4: require('./highlight/featured_service_4.jpg'),
  },

  Order: {
    Success: require('./food/order-success.png'),
    SuccessSVG: require('./icon/order-success.svg'),
  },

  Error: {
    Illustration: require('./icon/error-page-logo.svg'),
    NotFound: require('./icon/404-page-logo.svg'),
    ChuaThoaDieuKien: require('./icon/chua-thoa-dieu-kien.svg'),
  },

  Icons: {
    Icon: require('./icon/icon.png'),
    Splash: require('./icon/splash.png'),
    PromotionTag: require('./icon/promotion-tag.svg'),
  },
} satisfies ImageTree
