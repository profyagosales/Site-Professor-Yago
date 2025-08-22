export const getRole = () => localStorage.getItem('role');

export const isAuthed = () => ({
  authed: !!localStorage.getItem('token'),
  role: getRole()
});

