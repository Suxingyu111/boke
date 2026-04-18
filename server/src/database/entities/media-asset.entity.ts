import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('media_assets')
@Index('idx_media_assets_hash', ['hashValue'], { unique: true })
@Index('idx_media_assets_uploaded_by', ['uploadedBy'])
@Index('idx_media_assets_mime_type', ['mimeType'])
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_ext', type: 'varchar', length: 20 })
  fileExt: string;

  @Column({ name: 'file_size', type: 'bigint', unsigned: true })
  fileSize: number;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ type: 'int', nullable: true })
  width: number | null;

  @Column({ type: 'int', nullable: true })
  height: number | null;

  @Column({ name: 'alt_text', type: 'varchar', length: 255, nullable: true })
  altText: string | null;

  @Column({ name: 'storage_disk', type: 'varchar', length: 50, default: 'local' })
  storageDisk: string;

  @Column({ name: 'hash_value', type: 'varchar', length: 64, nullable: true })
  hashValue: string | null;

  @Column({ name: 'uploaded_by', type: 'char', length: 36, nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}