import { type EnrichedObjectMetadataItem } from '@/object-metadata/types/EnrichedObjectMetadataItem';

export const isLeadLikeObjectMetadataItem = (
  objectMetadataItem: Pick<
    EnrichedObjectMetadataItem,
    'nameSingular' | 'namePlural'
  >,
) => {
  const normalizedNameSingular = objectMetadataItem.nameSingular
    .trim()
    .toLowerCase();
  const normalizedNamePlural = objectMetadataItem.namePlural
    .trim()
    .toLowerCase();

  return normalizedNameSingular === 'lead' || normalizedNamePlural === 'leads';
};
