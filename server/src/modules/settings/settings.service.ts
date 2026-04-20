import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SETTINGS_CACHE_PREFIXES } from '@common/security/cache-prefixes';
import { ResponseCacheService } from '@common/security/response-cache.service';
import { Repository, In } from 'typeorm';
import { SiteSetting } from '@database/entities';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SiteSetting)
    private readonly settingRepository: Repository<SiteSetting>,
    @Optional()
    private readonly responseCacheService?: ResponseCacheService,
  ) {}

  /** 获取全部公开设置（前端展示用） */
  async findPublicSettings(): Promise<Record<string, unknown>> {
    const settings = await this.settingRepository.find({
      where: { isPublic: true },
    });
    return this.toPublicSettingsMap(settings);
  }

  /** 按分组获取全部设置（管理后台用） */
  async findAllSettings(groupName?: string): Promise<Record<string, unknown>> {
    const where = groupName ? { groupName } : {};
    const settings = await this.settingRepository.find({ where });
    return this.toKeyValueMap(settings);
  }

  /** 按 key 获取单个设置 */
  async findByKey(key: string): Promise<SiteSetting> {
    const setting = await this.settingRepository.findOne({
      where: { settingKey: key },
    });
    if (!setting) {
      throw new NotFoundException(`设置项 "${key}" 不存在`);
    }
    return setting;
  }

  /** 新增或更新单个设置 */
  async upsert(dto: UpsertSettingDto): Promise<SiteSetting> {
    const existing = await this.settingRepository.findOne({
      where: { settingKey: dto.settingKey },
    });

    if (existing) {
      existing.settingValue = dto.settingValue;
      if (dto.valueType !== undefined) existing.valueType = dto.valueType;
      if (dto.groupName !== undefined) existing.groupName = dto.groupName;
      if (dto.description !== undefined) existing.description = dto.description;
      if (dto.isPublic !== undefined) existing.isPublic = dto.isPublic;
      const savedSetting = await this.settingRepository.save(existing);
      await this.invalidatePublicCaches();
      return savedSetting;
    }

    const setting = this.settingRepository.create({
      settingKey: dto.settingKey,
      settingValue: dto.settingValue,
      valueType: dto.valueType ?? 'string',
      groupName: dto.groupName ?? 'general',
      description: dto.description ?? null,
      isPublic: dto.isPublic ?? false,
    });
    const savedSetting = await this.settingRepository.save(setting);
    await this.invalidatePublicCaches();
    return savedSetting;
  }

  /** 批量新增或更新设置 */
  async batchUpsert(items: UpsertSettingDto[]): Promise<Record<string, unknown>> {
    for (const item of items) {
      await this.upsert(item);
    }
    const keys = items.map(i => i.settingKey);
    const updated = await this.settingRepository.find({
      where: { settingKey: In(keys) },
    });
    await this.invalidatePublicCaches();
    return this.toKeyValueMap(updated);
  }

  /** 删除设置项 */
  async remove(key: string): Promise<void> {
    const setting = await this.findByKey(key);
    await this.settingRepository.remove(setting);
    await this.invalidatePublicCaches();
  }

  private async invalidatePublicCaches(): Promise<void> {
    await this.responseCacheService?.invalidatePrefixes(SETTINGS_CACHE_PREFIXES);
  }

  private toKeyValueMap(settings: SiteSetting[]): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (const s of settings) {
      map[s.settingKey] = s.settingValue;
    }
    return map;
  }

  private toPublicSettingsMap(settings: SiteSetting[]): Record<string, unknown> {
    const map = this.toKeyValueMap(settings);
    const socialLinks = settings.reduce<Record<string, string>>((result, setting) => {
      const normalizedKey = this.resolveSocialLinkKey(setting);
      if (!normalizedKey) {
        return result;
      }

      if (typeof setting.settingValue !== 'string') {
        return result;
      }

      const normalizedValue = setting.settingValue.trim();
      if (!normalizedValue) {
        return result;
      }

      result[normalizedKey] = normalizedValue;
      return result;
    }, {});

    if (Object.keys(socialLinks).length > 0) {
      map.socialLinks = socialLinks;
    }

    return map;
  }

  private resolveSocialLinkKey(setting: SiteSetting): string | null {
    if (setting.settingKey.startsWith('social_')) {
      return setting.settingKey.slice('social_'.length) || null;
    }

    if (setting.groupName === 'social' && typeof setting.settingKey === 'string') {
      return setting.settingKey.trim() || null;
    }

    return null;
  }
}
