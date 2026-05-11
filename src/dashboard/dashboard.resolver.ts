import { Resolver, Query, Args } from '@nestjs/graphql';
import { DashboardService } from './dashboard.service';
import { DashboardStats } from './entities/dashboard.entity';
import { DashboardStatsArgs } from './dto/dashboard-stats.args';
import { MetricsDashboard } from './entities/metrics-dashboard.entity';
import { MetricsDashboardFiltersInput } from './dto/metrics-dashboard-filters.input';
import { SuperAdminOnly } from 'src/auth';

@Resolver(() => DashboardStats)
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => DashboardStats, { name: 'getDashboardStats' })
  getStats(@Args() args: DashboardStatsArgs) {
    return this.dashboardService.getStats(args);
  }

  @SuperAdminOnly()
  @Query(() => MetricsDashboard, { name: 'getMetricsDashboard' })
  getMetricsDashboard(
    @Args('filters', {
      type: () => MetricsDashboardFiltersInput,
      nullable: true,
    })
    filters: MetricsDashboardFiltersInput,
  ) {
    return this.dashboardService.getMetricsDashboard(filters);
  }
}
