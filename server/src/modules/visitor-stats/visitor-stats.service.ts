import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VisitorLog } from '@database/entities';
import { RecordVisitDto } from './dto/record-visit.dto';

@Injectable()
export class VisitorStatsService {
  private readonly logger = new Logger(VisitorStatsService.name);

  constructor(
    @InjectRepository(VisitorLog)
    private readonly visitorLogRepository: Repository<VisitorLog>,
  ) {}

  /** 记录访问 */
  async recordVisit(dto: RecordVisitDto, ip: string, userAgent: string | null) {
    const today = new Date().toISOString().slice(0, 10);
    const parsed = this.parseUserAgent(userAgent);

    const log = this.visitorLogRepository.create({
      ip: ip.slice(0, 45),
      userAgent: userAgent?.slice(0, 500) ?? null,
      referer: dto.referer?.slice(0, 500) ?? null,
      path: dto.path.slice(0, 500),
      visitDate: today,
      stayDuration: dto.stayDuration ?? 0,
      device: parsed.device,
      browser: parsed.browser,
      os: parsed.os,
    });

    try {
      await this.visitorLogRepository.save(log);
    } catch (error) {
      this.logger.warn('记录访问日志失败', error);
    }

    return { recorded: true };
  }

  /** 获取今日统计摘要 */
  async getTodayStats() {
    const today = new Date().toISOString().slice(0, 10);

    const [totalVisits, uniqueIps, stayStats] = await Promise.all([
      this.visitorLogRepository.count({ where: { visitDate: today } }),
      this.visitorLogRepository
        .createQueryBuilder('v')
        .select('COUNT(DISTINCT v.ip)', 'count')
        .where('v.visit_date = :today', { today })
        .getRawOne()
        .then(row => Number(row?.count ?? 0)),
      this.visitorLogRepository
        .createQueryBuilder('v')
        .select('AVG(v.stay_duration)', 'avgStayDuration')
        .where('v.visit_date = :today', { today })
        .getRawOne(),
    ]);

    return {
      totalVisits,
      uniqueVisitors: uniqueIps,
      avgStayDuration: Math.round(Number(stayStats?.avgStayDuration ?? 0)),
    };
  }

  /** 获取指定日期范围的统计数据 */
  async getStatsRange(startDate: string, endDate: string) {
    const rows = await this.visitorLogRepository
      .createQueryBuilder('v')
      .select('v.visit_date', 'date')
      .addSelect('COUNT(*)', 'totalVisits')
      .addSelect('COUNT(DISTINCT v.ip)', 'uniqueVisitors')
      .where('v.visit_date >= :startDate AND v.visit_date <= :endDate', { startDate, endDate })
      .groupBy('v.visit_date')
      .orderBy('v.visit_date', 'ASC')
      .getRawMany();

    return rows.map(row => ({
      date: row.date,
      totalVisits: Number(row.totalVisits),
      uniqueVisitors: Number(row.uniqueVisitors),
    }));
  }

  /** 获取热门页面排行 */
  async getTopPages(limit = 20, days = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().slice(0, 10);

    return this.visitorLogRepository
      .createQueryBuilder('v')
      .select('v.path', 'path')
      .addSelect('COUNT(*)', 'visits')
      .addSelect('COUNT(DISTINCT v.ip)', 'uniqueVisitors')
      .where('v.visit_date >= :since', { since })
      .groupBy('v.path')
      .orderBy('visits', 'DESC')
      .limit(limit)
      .getRawMany()
      .then(rows =>
        rows.map(row => ({
          path: row.path,
          visits: Number(row.visits),
          uniqueVisitors: Number(row.uniqueVisitors),
        })),
      );
  }

  /** 获取来源统计 */
  async getRefererStats(days = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().slice(0, 10);

    return this.visitorLogRepository
      .createQueryBuilder('v')
      .select('v.referer', 'referer')
      .addSelect('COUNT(*)', 'count')
      .where('v.visit_date >= :since AND v.referer IS NOT NULL', { since })
      .groupBy('v.referer')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany()
      .then(rows =>
        rows.map(row => ({
          referer: row.referer,
          visits: Number(row.count),
        })),
      );
  }

  /** 获取设备/浏览器/OS 统计 */
  async getDeviceStats(days = 30) {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().slice(0, 10);

    const [devices, browsers, osStats] = await Promise.all([
      this.groupByField('device', since),
      this.groupByField('browser', since),
      this.groupByField('os', since),
    ]);

    return { devices, browsers, os: osStats };
  }

  private async groupByField(field: string, since: string) {
    return this.visitorLogRepository
      .createQueryBuilder('v')
      .select(`v.${field}`, 'name')
      .addSelect('COUNT(*)', 'count')
      .where(`v.visit_date >= :since AND v.${field} IS NOT NULL`, { since })
      .groupBy(`v.${field}`)
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany()
      .then(rows =>
        rows.map(row => ({ name: row.name, count: Number(row.count) })),
      );
  }

  private parseUserAgent(ua: string | null) {
    if (!ua) return { device: null, browser: null, os: null };

    let device = 'Desktop';
    if (/mobile/i.test(ua)) device = 'Mobile';
    else if (/tablet|ipad/i.test(ua)) device = 'Tablet';

    let browser = 'Other';
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edg/i.test(ua)) browser = 'Edge';

    let os = 'Other';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac os/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

    return { device, browser, os };
  }
}
