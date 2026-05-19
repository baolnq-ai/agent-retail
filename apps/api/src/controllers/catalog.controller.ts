import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { CatalogService } from '../services/catalog.service.js';

@Controller('/api/v1')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('/products')
  async listProducts() {
    return { items: await this.catalogService.listProducts() };
  }

  @Get('/products/:id')
  async getProduct(@Param('id') productId: string) {
    const product = await this.catalogService.getProduct(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  @Get('/search/products')
  async searchProducts(@Query('q') query = '') {
    return { items: await this.catalogService.searchProducts(query) };
  }
}
