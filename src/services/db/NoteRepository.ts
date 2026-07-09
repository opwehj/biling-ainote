import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Note, NoteFilter, SortOrder } from '../../types';
import { generateId } from '../../utils/id';
import logger from '../../utils/logger';

const NOTES_KEY = 'biling_notes';

export class NoteRepository {
  async findAll(filter?: NoteFilter, sortOrder?: SortOrder): Promise<Note[]> {
    try {
      const raw = await AsyncStorage.getItem(NOTES_KEY);
      const notes: Note[] = raw ? JSON.parse(raw) : [];
      let result = [...notes];
      if (filter?.keyword) {
        const kw = filter.keyword.toLowerCase();
        result = result.filter(n => n.title.toLowerCase().includes(kw) || n.content.toLowerCase().includes(kw));
      }
      if (filter?.categoryId) result = result.filter(n => n.categoryId === filter.categoryId);
      result.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
      return result;
    } catch (err) { logger.error('NoteRepository.findAll failed', err); return []; }
  }
  async findById(id: string): Promise<Note | null> {
    const notes = await this.findAll();
    return notes.find(n => n.id === id) ?? null;
  }
  async create(note: Note): Promise<Note> {
    const notes = await this.findAll();
    notes.push(note);
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    return note;
  }
  async update(note: Note): Promise<void> {
    const notes = await this.findAll();
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) { notes[idx] = note; await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
  }
  async delete(id: string): Promise<void> {
    const notes = await this.findAll();
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes.filter(n => n.id !== id)));
  }
}
export const noteRepository = new NoteRepository();
