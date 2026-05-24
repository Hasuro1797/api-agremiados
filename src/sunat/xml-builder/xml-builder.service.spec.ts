import { Test, TestingModule } from '@nestjs/testing';
import { XmlBuilderService } from './xml-builder.service';

describe('XmlBuilderService', () => {
  let service: XmlBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [XmlBuilderService],
    }).compile();

    service = module.get<XmlBuilderService>(XmlBuilderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
