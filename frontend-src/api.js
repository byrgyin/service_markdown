import { ca } from "date-fns/locale";

const PREFIX = "???";

const req = (url, options = {}) => {
  const {body} = options;

  return fetch((PREFIX + url).replace(/\/\/$/, ""), {
    ...options,
    body: body ? JSON.stringify(body) : null,
    headers: {
      ...options.headers,
      ...(body
        ? {
          "Content-Type": "application/json",
        }
        : null),
    },
  }).then((res) =>
    res.ok
      ? res.json()
      : res.text().then((message) => {
        throw new Error(message);
      })
  );
};

/*export const getNotes = ({ age, search, page } = {}) => {};*/
export const getNotes = async ({age, search, page} = {}) => {
  const response = await fetch(`/note?age=${age}&search=${search}&page=${page}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  const data = await response.json();
  return data;
};

export const createNote = async (title, text) => {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({title, text}),
  }
  try {
    const response = await fetch('/new', options);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
};

export const getNote = async (id) => {
  try {
    const response = await fetch(`/note/${id}`);
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.error('Error get note:', error);
    throw error;
  }
};

export const archiveNote = async (id) => {
  const options = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({isArchived: true}),
  };
  try {
    const response = await fetch(`/note/${id}`, options);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error dont archive:', error);
    throw error;
  }
};

export const unarchiveNote = async (id) => {
  const options = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({isArchived: false}),
  };
  try {
    const response = await fetch(`/note/${id}`, options);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error dont archive:', error);
    throw error;
  }
};

export const editNote = async (id, title, text) => {
  const options = {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({title, text}),
  }
  try {
    const response = await fetch(`/note/${id}/edit`, options);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  }catch (error){
    console.error(error.message);
    throw error;
  }
};

export const deleteNote = async (id) => {
  const options = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  try {
    const response = await fetch(`/note/${id}`, options);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error dont archive:', error);
    throw error;
  }
};

export const deleteAllArchived = async () => {
  const options = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  try {
    const response = await fetch('/note', options);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.error('Error dont archive:', e);
  }
};

export const notePdfUrl = async (id) => {
  const options = {
    method: 'GET',
    credentials: 'include'
  }
  try {
    const response = await fetch(`/note/${id}/pdf`, options);

    if(!response.ok) {
      throw new Error('Error Load PDF');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `note-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (e) {
    console.error('Error dont notePdfUrl:', e);
  }
};
