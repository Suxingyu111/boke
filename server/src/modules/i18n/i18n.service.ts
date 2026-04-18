import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSetting } from '@database/entities';

export type SupportedLocale = 'zh-CN' | 'en-US';

const DEFAULT_LOCALE: SupportedLocale = 'zh-CN';

/** 内置翻译包 */
const BUILTIN_TRANSLATIONS: Record<SupportedLocale, Record<string, string>> = {
  'zh-CN': {
    'site.home': '首页',
    'site.articles': '文章',
    'site.categories': '分类',
    'site.tags': '标签',
    'site.about': '关于',
    'site.links': '友情链接',
    'site.guestbook': '留言板',
    'site.search': '搜索',
    'site.login': '登录',
    'site.register': '注册',
    'site.logout': '退出',
    'site.profile': '个人中心',
    'site.favorites': '我的收藏',
    'site.admin': '后台管理',
    'article.readMore': '阅读全文',
    'article.publishedAt': '发布于',
    'article.views': '阅读',
    'article.likes': '点赞',
    'article.comments': '评论',
    'article.share': '分享',
    'article.favorite': '收藏',
    'article.unfavorite': '取消收藏',
    'common.loading': '加载中...',
    'common.noData': '暂无数据',
    'common.submit': '提交',
    'common.cancel': '取消',
    'common.confirm': '确认',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.save': '保存',
    'error.notFound': '页面不存在',
    'error.serverError': '服务器错误',
    'error.unauthorized': '请先登录',
  },
  'en-US': {
    'site.home': 'Home',
    'site.articles': 'Articles',
    'site.categories': 'Categories',
    'site.tags': 'Tags',
    'site.about': 'About',
    'site.links': 'Links',
    'site.guestbook': 'Guestbook',
    'site.search': 'Search',
    'site.login': 'Login',
    'site.register': 'Register',
    'site.logout': 'Logout',
    'site.profile': 'Profile',
    'site.favorites': 'My Favorites',
    'site.admin': 'Admin',
    'article.readMore': 'Read More',
    'article.publishedAt': 'Published at',
    'article.views': 'Views',
    'article.likes': 'Likes',
    'article.comments': 'Comments',
    'article.share': 'Share',
    'article.favorite': 'Favorite',
    'article.unfavorite': 'Unfavorite',
    'common.loading': 'Loading...',
    'common.noData': 'No data',
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.save': 'Save',
    'error.notFound': 'Page not found',
    'error.serverError': 'Server error',
    'error.unauthorized': 'Please login first',
  },
};

@Injectable()
export class I18nService {
  constructor(
    @InjectRepository(SiteSetting)
    private readonly settingRepository: Repository<SiteSetting>,
  ) {}

  /** 获取支持的语言列表 */
  getSupportedLocales(): Array<{ code: SupportedLocale; name: string }> {
    return [
      { code: 'zh-CN', name: '中文' },
      { code: 'en-US', name: 'English' },
    ];
  }

  /** 获取指定语言的全部翻译 */
  async getTranslations(locale: SupportedLocale): Promise<Record<string, string>> {
    const builtinPack = BUILTIN_TRANSLATIONS[locale] || BUILTIN_TRANSLATIONS[DEFAULT_LOCALE];

    // 从数据库加载自定义翻译覆盖
    const customSetting = await this.settingRepository.findOne({
      where: { settingKey: `i18n_${locale}` },
    });

    if (customSetting && typeof customSetting.settingValue === 'object') {
      return { ...builtinPack, ...(customSetting.settingValue as Record<string, string>) };
    }

    return builtinPack;
  }

  /** 获取当前站点默认语言 */
  async getDefaultLocale(): Promise<SupportedLocale> {
    const setting = await this.settingRepository.findOne({
      where: { settingKey: 'default_locale' },
    });

    if (setting && typeof setting.settingValue === 'string') {
      return setting.settingValue as SupportedLocale;
    }

    return DEFAULT_LOCALE;
  }

  /** 设置站点默认语言（管理端） */
  async setDefaultLocale(locale: SupportedLocale): Promise<{ locale: SupportedLocale }> {
    const validLocales: SupportedLocale[] = ['zh-CN', 'en-US'];
    if (!validLocales.includes(locale)) {
      throw new NotFoundException(`不支持的语言：${locale}`);
    }

    let setting = await this.settingRepository.findOne({
      where: { settingKey: 'default_locale' },
    });

    if (setting) {
      setting.settingValue = locale;
      await this.settingRepository.save(setting);
    } else {
      setting = this.settingRepository.create({
        settingKey: 'default_locale',
        settingValue: locale,
        valueType: 'string',
        groupName: 'i18n',
        description: '站点默认语言',
        isPublic: true,
      });
      await this.settingRepository.save(setting);
    }

    return { locale };
  }
}
