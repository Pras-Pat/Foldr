/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StatusType = 'Active' | 'Parked' | 'Done';

export interface Tab {
  id: string;
  collectionId: string;
  url: string;
  title: string;
  favicon: string;
  addedAt: string; // ISO string
}

export interface Collection {
  id: string;
  name: string;
  icon: string; // Lucide icon name, e.g., 'palette', 'briefcase', 'book'
  iconColor: string; // hex color codes
  status: StatusType;
  starred: boolean;
  createdAt: string; // ISO string
  lastOpenedAt: string; // ISO string
  tabs: Tab[];
}

export const INITIAL_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    name: 'Design Inspo',
    icon: 'palette',
    iconColor: '#F97316',
    status: 'Active',
    starred: false,
    createdAt: new Date('2026-05-20T10:00:00Z').toISOString(),
    lastOpenedAt: new Date('2026-05-31T09:00:00Z').toISOString(),
    tabs: [
      {
        id: 'tab-1-1',
        collectionId: 'col-1',
        url: 'https://www.awwwards.com',
        title: 'Awwwards - Website Awards & Trends',
        favicon: 'https://www.google.com/s2/favicons?domain=https://www.awwwards.com&sz=32',
        addedAt: new Date('2026-05-21T10:15:00Z').toISOString(),
      },
      {
        id: 'tab-1-2',
        collectionId: 'col-1',
        url: 'https://dribbble.com',
        title: "Dribbble - Discover the World's Top Designers",
        favicon: 'https://www.google.com/s2/favicons?domain=https://dribbble.com&sz=32',
        addedAt: new Date('2026-05-22T14:30:00Z').toISOString(),
      },
      {
        id: 'tab-1-3',
        collectionId: 'col-1',
        url: 'https://www.siteinspire.com',
        title: 'Siteinspire - Web Design Inspiration Gallery',
        favicon: 'https://www.google.com/s2/favicons?domain=https://www.siteinspire.com&sz=32',
        addedAt: new Date('2026-05-23T11:45:00Z').toISOString(),
      }
    ]
  },
  {
    id: 'col-2',
    name: 'Job Search',
    icon: 'briefcase',
    iconColor: '#10B981',
    status: 'Parked',
    starred: false,
    createdAt: new Date('2026-05-24T08:00:00Z').toISOString(),
    lastOpenedAt: new Date('2026-05-31T08:30:00Z').toISOString(),
    tabs: [
      {
        id: 'tab-2-1',
        collectionId: 'col-2',
        url: 'https://www.linkedin.com',
        title: 'LinkedIn: Log In or Sign Up',
        favicon: 'https://www.google.com/s2/favicons?domain=https://www.linkedin.com&sz=32',
        addedAt: new Date('2026-05-24T09:12:00Z').toISOString(),
      },
      {
        id: 'tab-2-2',
        collectionId: 'col-2',
        url: 'https://wellfound.com',
        title: 'Remote Jobs in Tech - Wellfound',
        favicon: 'https://www.google.com/s2/favicons?domain=https://wellfound.com&sz=32',
        addedAt: new Date('2026-05-25T16:40:00Z').toISOString(),
      }
    ]
  },
  {
    id: 'col-3',
    name: 'Reading List',
    icon: 'book',
    iconColor: '#5B5BD6',
    status: 'Active',
    starred: true,
    createdAt: new Date('2026-05-26T12:00:00Z').toISOString(),
    lastOpenedAt: new Date('2026-05-31T09:47:00Z').toISOString(),
    tabs: [
      {
        id: 'tab-3-1',
        collectionId: 'col-3',
        url: 'https://linear.app/method',
        title: 'Linear Method - How to build product',
        favicon: 'https://www.google.com/s2/favicons?domain=https://linear.app/method&sz=32',
        addedAt: new Date('2026-05-26T12:05:00Z').toISOString(),
      },
      {
        id: 'tab-3-2',
        collectionId: 'col-3',
        url: 'https://paulgraham.com/writing.html',
        title: 'The Craft of Writing - Paul Graham',
        favicon: 'https://www.google.com/s2/favicons?domain=https://paulgraham.com/writing.html&sz=32',
        addedAt: new Date('2026-05-27T15:20:00Z').toISOString(),
      },
      {
        id: 'tab-3-3',
        collectionId: 'col-3',
        url: 'https://news.ycombinator.com',
        title: 'HN: Hacker News',
        favicon: 'https://www.google.com/s2/favicons?domain=https://news.ycombinator.com&sz=32',
        addedAt: new Date('2026-05-28T09:02:00Z').toISOString(),
      },
      {
        id: 'tab-3-4',
        collectionId: 'col-3',
        url: 'https://docs.stripe.com',
        title: 'Stripe Docs - Integration API Guide',
        favicon: 'https://www.google.com/s2/favicons?domain=https://docs.stripe.com&sz=32',
        addedAt: new Date('2026-05-29T14:45:00Z').toISOString(),
      }
    ]
  }
];
