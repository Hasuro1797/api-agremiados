import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { OrganizationResolver } from './organization/organization.resolver';
import { OrganizationService } from './organization/organization.service';
import { QuoteAmountResolver } from './quote-amount/quote-amount.resolver';
import { QuoteAmountService } from './quote-amount/quote-amount.service';
import { QuotaDiscountResolver } from './quota-discount/quota-discount.resolver';
import { QuotaDiscountService } from './quota-discount/quota-discount.service';
import { NotificationTemplateResolver } from './notification-template/notification-template.resolver';
import { NotificationTemplateService } from './notification-template/notification-template.service';
import { AutomationRuleResolver } from './automation-rule/automation-rule.resolver';
import { AutomationRuleService } from './automation-rule/automation-rule.service';
import { AutomationEngineService } from './automation-rule/automation-engine.service';
import { AutomationEngineTask } from './automation-rule/tasks/automation-engine.task';
import { BillingConfigResolver } from './billing/billing-config/billing-config.resolver';
import { BillingConfigService } from './billing/billing-config/billing-config.service';
import { DocumentSeriesResolver } from './billing/document-series/document-series.resolver';
import { DocumentSeriesService } from './billing/document-series/document-series.service';

@Module({
  imports: [CloudinaryModule],
  providers: [
    OrganizationResolver,
    OrganizationService,
    QuoteAmountResolver,
    QuoteAmountService,
    QuotaDiscountResolver,
    QuotaDiscountService,
    NotificationTemplateResolver,
    NotificationTemplateService,
    AutomationRuleResolver,
    AutomationRuleService,
    AutomationEngineService,
    AutomationEngineTask,
    BillingConfigResolver,
    BillingConfigService,
    DocumentSeriesResolver,
    DocumentSeriesService,
  ],
  exports: [DocumentSeriesService, BillingConfigService],
})
export class SettingsModule {}
