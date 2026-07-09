import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Category } from '../../types';
import { generateId } from '../../utils/id';
import logger from '../../utils/logger';
const KEY = 'biling_categories';
export class CategoryRepository {
  async findAll(): Promise<Category[]> {
    try { const raw = await AsyncStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  }
  async create(name: string, color: string): Promise<Category> {
    const cats = await this.findAll();
    const cat: Category = { id: generateId(), name, color, sortOrder: cats.length, createdAt: Date.now() };
    cats.push(cat); await AsyncStorage.setItem(KEY, JSON.stringify(cats)); return cat;
  }
  async delete(id: string): Promise<void> {
    const cats = (await this.findAll()).filter(c => c.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(cats));
  }
  async update(id: string, name: string, color: string): Promise<void> {
    const cats = await this.findAll();
    const c = cats.find(x => x.id === id); if (c) { c.name = name; c.color = color; await AsyncStorage.setItem(KEY, JSON.stringify(cats)); }
  }
}
export const categoryRepository = new CategoryRepository();
