import { useMemo } from 'react';

import { objectMetadataItemsWithFieldsSelector } from '@/object-metadata/states/objectMetadataItemsWithFieldsSelector';
import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { isLeadLikeObjectMetadataItem } from '@/object-metadata/utils/isLeadLikeObjectMetadataItem';

export const useFilteredObjectMetadataItems = () => {
  const objectMetadataItemsWithFields = useAtomStateValue(
    objectMetadataItemsWithFieldsSelector,
  );
  const objectMetadataItems = objectMetadataItemsWithFields;

  const activeNonSystemObjectMetadataItems = useMemo(
    () =>
      objectMetadataItems.filter(
        ({ isActive, isSystem, nameSingular, namePlural }) =>
          isActive &&
          !isSystem &&
          !isLeadLikeObjectMetadataItem({
            nameSingular,
            namePlural,
          }),
      ),
    [objectMetadataItems],
  );

  const activeObjectMetadataItems = useMemo(
    () =>
      objectMetadataItems
        .filter(
          ({ isActive, nameSingular, namePlural }) =>
            isActive &&
            !isLeadLikeObjectMetadataItem({
              nameSingular,
              namePlural,
            }),
        )
        .sort((a, b) => a.labelSingular.localeCompare(b.labelSingular)),
    [objectMetadataItems],
  );

  const alphaSortedActiveNonSystemObjectMetadataItems = [
    ...activeNonSystemObjectMetadataItems,
  ].sort((a, b) => {
    if (a.nameSingular < b.nameSingular) {
      return -1;
    }
    if (a.nameSingular > b.nameSingular) {
      return 1;
    }
    return 0;
  });

  const inactiveNonSystemObjectMetadataItems = objectMetadataItems.filter(
    ({ isActive, isSystem, nameSingular, namePlural }) =>
      !isActive &&
      !isSystem &&
      !isLeadLikeObjectMetadataItem({
        nameSingular,
        namePlural,
      }),
  );

  const findActiveObjectMetadataItemByNamePlural = (namePlural: string) =>
    activeNonSystemObjectMetadataItems.find(
      (activeObjectMetadataItem) =>
        activeObjectMetadataItem.namePlural === namePlural,
    );

  const findObjectMetadataItemById = (id: string) =>
    objectMetadataItems.find(
      (objectMetadataItem) => objectMetadataItem.id === id,
    );

  const findObjectMetadataItemByNamePlural = (namePlural: string) =>
    objectMetadataItems.find(
      (objectMetadataItem) => objectMetadataItem.namePlural === namePlural,
    );

  return {
    activeNonSystemObjectMetadataItems,
    activeObjectMetadataItems,
    findObjectMetadataItemById,
    findObjectMetadataItemByNamePlural,
    findActiveObjectMetadataItemByNamePlural,
    inactiveNonSystemObjectMetadataItems,
    objectMetadataItems,
    alphaSortedActiveNonSystemObjectMetadataItems,
  };
};
