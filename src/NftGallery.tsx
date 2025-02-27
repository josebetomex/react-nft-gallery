import React, { CSSProperties, useEffect, useState } from 'react';
import InView from 'react-intersection-observer';

import { GalleryItem } from './components/GalleryItem/GalleryItem';
import { LoadMoreButton } from './components/LoadMoreButton';
import { OpenseaAsset } from './types/OpenseaAsset';
import { isEnsDomain, joinClassNames } from './utils';
import {
  fetchOpenseaAssets,
  fetchOpenseaAssetsByContract,
  OPENSEA_API_OFFSET,
  resolveEnsDomain,
} from './api';

import './styles/tailwind.css';
import './styles/loader.css';

export interface NftGalleryProps {
  /**
   * Ethereum address (`0x...`) or ENS domain (`vitalik.eth`) for which the gallery should contain associated NFTs.
   * Required.
   */
  ownerAddress: string;
  
  /**
   * Ethereum address (`0x...`) or ENS domain (`kittys.eth`) for which the gallery should contain associated NFTs.
   * Required.
   */
  contractAddress: string;

  /**
   * Display asset metadata underneath the NFT.
   * Defaults to `true`.
   */
  
  //fetchOpenseaAssetsByContract
  devnet: boolean;
  
  
  metadataIsVisible?: boolean;

  /**
   * Display gallery in dark mode.
   * Defaults to `false`.
   */
  darkMode?: boolean;

  /**
   * Display gallery in showcase mode. Only NFTs specified in `showcaseItemIds` will be rendered.
   * Defaults to `false`.
   */
  showcaseMode?: boolean;

  /**
   * An array of IDs for assets that should be displayed when `showcaseMode` is active.
   * Each ID is formed by combining the asset's contract address and the asset's own tokenId: `{:assetContractAddress}/{:tokenId}`
   *
   * For example:
   *
   * ```jsx
   * showcaseItemIds={["0xabcdef.../123", "0xa1b2c3.../789"]}
   * ```
   */
  showcaseItemIds?: string[];

  /**
   * Enables/disables the lightbox being shown when a gallery item is clicked/tapped.
   * Defaults to `true`.
   */
  hasLightbox?: boolean;

  /**
   * Enables/disables a gallery item's title and collection name linking to the asset and collection on OpenSea, respectively.
   * Defaults to `true`.
   */
  hasExternalLinks?: boolean;

  /**
   * Renders the gallery as a single row with horizontal scrolling. Useful when rendering the gallery between other content.
   * Defaults to `false`.
   */
  isInline?: boolean;

  /**
   * Disables lazy loading and shows a "Load more" button to fetch the next set of gallery items.
   * Defaults to `false`.
   */
  hasLoadMoreButton?: boolean;

  /**
   * Overrides the default styling of the gallery's container.
   */
  galleryContainerStyle?: CSSProperties;

  /**
   * Overrides the default styling of all gallery item containers.
   */
  itemContainerStyle?: CSSProperties;

  /**
   * Overrides the default styling of all gallery item image containers.
   */
  imgContainerStyle?: CSSProperties;
}

export const NftGallery: React.FC<NftGalleryProps> = ({
  ownerAddress = '',
  contractAddress = '',
  devnet = false,
  darkMode = false,
  metadataIsVisible = true,
  showcaseMode = false,
  showcaseItemIds,
  hasLightbox = true,
  hasExternalLinks = true,
  isInline = false,
  hasLoadMoreButton = false,
  galleryContainerStyle,
  itemContainerStyle,
  imgContainerStyle,
}) => {
  const [assets, setAssets] = useState([] as OpenseaAsset[]);
  const [showcaseAssets, setShowcaseAssets] = useState([] as OpenseaAsset[]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const displayedAssets = showcaseMode ? showcaseAssets : assets;

  const loadAssets = async (
    ownerAddress: NftGalleryProps['ownerAddress'],
    contractAddress: NftGalleryProps['contractAddress'],
    devnet: NftGalleryProps['devnet'],
    offset: number
  ) => {
    if (assets.length === 0) setIsLoading(true);
    const resolvedOwner = isEnsDomain(ownerAddress)
      ? await resolveEnsDomain(ownerAddress)
      : ownerAddress;
    let rawAssets:OpenseaAsset[];
    if (!contractAddress){
      rawAssets = await fetchOpenseaAssets(resolvedOwner, offset);
    } else {
      rawAssets = await fetchOpenseaAssetsByContract(resolvedOwner, contractAddress, devnet, offset);
    }
    setAssets((prevAssets) => [...prevAssets, ...rawAssets]);
    setCanLoadMore(rawAssets.length === OPENSEA_API_OFFSET);
    if (assets.length === 0) setIsLoading(false);
  };

  const updateShowcaseAssets = (
    allAssets: OpenseaAsset[],
    itemIds: string[]
  ) => {
    const nextShowcaseAssets = allAssets.filter((asset) =>
      itemIds.includes(`${asset.asset_contract.address}/${asset.token_id}`)
    );
    setShowcaseAssets(nextShowcaseAssets);
  };

  // TODO: Move into `Lightbox` component once its refactored to being a singleton.
  const handleKeydownEvent = (evt: KeyboardEvent) => {
    const hasActiveLightbox =
      window.location.hash.includes('lightbox-') &&
      window.location.hash !== '#lightbox-untarget';

    if (!hasActiveLightbox) {
      return;
    }

    const decreaseLightboxIndex = () => {
      // Do nothing if we're at minimum index already.
      if (lightboxIndex === 0) return;
      const nextIndex = lightboxIndex - 1;
      setLightboxIndex(nextIndex);
      window.location.assign(`#lightbox-${nextIndex}`);
    };
    const increaseLightboxIndex = () => {
      // Do nothing if we're at maximum index already.
      if (lightboxIndex === assets.length - 1) return;
      const nextIndex = lightboxIndex + 1;
      setLightboxIndex(nextIndex);
      window.location.assign(`#lightbox-${nextIndex}`);
    };

    switch (evt.key) {
      case 'ArrowLeft':
        return decreaseLightboxIndex();
      case 'ArrowRight':
        return increaseLightboxIndex();
      case 'Escape':
        return window.location.assign(`#lightbox-untarget`);
      default:
        break;
    }
  };

  useEffect(() => {
    loadAssets(ownerAddress, contractAddress, devnet, currentOffset);
  }, [ownerAddress, currentOffset]);

  useEffect(() => {
    if (assets.length !== 0 && showcaseMode && Array.isArray(showcaseItemIds)) {
      updateShowcaseAssets(assets, showcaseItemIds);
    }
  }, [assets, showcaseMode, showcaseItemIds]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeydownEvent);
    return () => {
      document.removeEventListener('keydown', handleKeydownEvent);
    };
  }, [assets, lightboxIndex]);

  return (
    <div
      className={joinClassNames(darkMode ? 'rnftg-dark' : '', 'rnftg-h-full')}
    >
      <div
        style={galleryContainerStyle}
        className={joinClassNames(
          'rnftg-h-full rnftg-p-6 rnftg-overflow-auto rnftg-bg-gray-50 dark:rnftg-bg-gray-900',
          isInline ? 'rnftg--inline' : ''
        )}
      >
        {isLoading ? (
          <div className="rnftg-flex rnftg-justify-center rnftg-items-center rnftg-h-full dark:rnftg-text-gray-200">
            <div className="rnftg-loader rnftg-text-gray-800 dark:rnftg-text-gray-200"></div>
          </div>
        ) : (
          <div
            className={joinClassNames(
              'rnftg-flex',
              isInline ? 'rnftg-flex-row' : 'rnftg-flex-col'
            )}
          >
            <div
              className={joinClassNames(
                'rnftg-grid rnftg-gap-6',
                isInline
                  ? 'rnftg-grid-flow-col'
                  : 'rnftg-grid-flow-row rnftg-grid-cols-1 md:rnftg-grid-cols-2 lg:rnftg-grid-cols-3 xl:rnftg-grid-cols-4'
              )}
            >
              {displayedAssets.map((asset, index) => {
                const isLastItemInPage = (index + 1) % OPENSEA_API_OFFSET === 0;
                return isLastItemInPage ? (
                  <InView
                    triggerOnce
                    onChange={(isInView) => {
                      if (!hasLoadMoreButton && isInView) {
                        setCurrentOffset(
                          (prevOffset) => prevOffset + OPENSEA_API_OFFSET
                        );
                      }
                    }}
                    key={asset.id}
                  >
                    <GalleryItem
                      index={index}
                      asset={asset}
                      metadataIsVisible={metadataIsVisible}
                      hasLightbox={hasLightbox}
                      setLightboxIndex={setLightboxIndex}
                      hasExternalLinks={hasExternalLinks}
                      itemContainerStyle={itemContainerStyle}
                      imgContainerStyle={imgContainerStyle}
                    />
                  </InView>
                ) : (
                  <GalleryItem
                    key={asset.id}
                    index={index}
                    asset={asset}
                    metadataIsVisible={metadataIsVisible}
                    hasLightbox={hasLightbox}
                    setLightboxIndex={setLightboxIndex}
                    hasExternalLinks={hasExternalLinks}
                    itemContainerStyle={itemContainerStyle}
                    imgContainerStyle={imgContainerStyle}
                  />
                );
              })}
            </div>
            {hasLoadMoreButton && canLoadMore && (
              <LoadMoreButton
                onClick={() => {
                  setCurrentOffset(
                    (prevOffset) => prevOffset + OPENSEA_API_OFFSET
                  );
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
