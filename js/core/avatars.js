/* Player avatars: eight geometric "cores". */
const A = [
  '<path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" fill="none" stroke="#38e1ff" stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" fill="#38e1ff"/>',
  '<path d="M12 3l9 16H3z" fill="none" stroke="#ff5fa8" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="2.6" fill="#ff5fa8"/>',
  '<ellipse cx="12" cy="12" rx="9.5" ry="3.8" fill="none" stroke="#9d7bff" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)" fill="none" stroke="#9d7bff" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-60 12 12)" fill="none" stroke="#9d7bff" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="#fff"/>',
  '<path d="M12 2.8l2.6 6.1 6.6.5-5 4.3 1.6 6.4L12 16.7l-5.8 3.4 1.6-6.4-5-4.3 6.6-.5z" fill="none" stroke="#ffc54d" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.8" fill="#ffc54d"/>',
  '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" fill="#4cf3a3"/>',
  '<path d="M12 2.5l6 6.5-6 12.5L6 9z" fill="none" stroke="#38e1ff" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 9h12M12 2.5v19" stroke="#38e1ff" stroke-width="1.1" opacity=".6"/>',
  '<circle cx="12" cy="12" r="8.5" fill="none" stroke="#ff8a3d" stroke-width="1.7"/><circle cx="12" cy="12" r="4" fill="none" stroke="#ff8a3d" stroke-width="1.7"/><circle cx="18.6" cy="6.6" r="1.8" fill="#ff8a3d"/>',
  '<rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="#9d7bff" stroke-width="1.7" transform="rotate(45 12 12)"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.5" fill="#ff5fa8"/>',
];
export const AVATAR_COUNT = A.length;
export const avatarSVG = i => `<svg viewBox="0 0 24 24" aria-hidden="true">${A[((i % A.length) + A.length) % A.length]}</svg>`;
