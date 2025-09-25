/* eslint-disable max-len */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';

const USER_ID = 3513;

interface Todo {
  id: number;
  userId: number;
  title: string;
  completed: boolean;
}

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (error) {
      timer = setTimeout(() => {
        setError(null);
      }, 3000);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [error]);

  useEffect(() => {
    if (!USER_ID) {
      return;
    }

    fetch(`https://mate.academy/students-api/todos?userId=${USER_ID}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Unable to load todos');
        }

        return res.json();
      })
      .then((data: Todo[]) => setTodos(data))
      .catch(() => setError('Unable to load todos'));
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();

    if (!title) {
      setError('Title should not be empty');

      return;
    }

    const temp: Todo = {
      id: 0,
      userId: USER_ID,
      title,
      completed: false,
    };

    setTempTodo(temp);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('https://mate.academy/students-api/todos', {
        method: 'POST',
        body: JSON.stringify({
          title,
          userId: USER_ID,
          completed: false,
        }),
        headers: { 'Content-type': 'application/json; charset=UTF-8' },
      });

      if (!response.ok) {
        throw new Error();
      }

      const created: Todo = await response.json();

      setTodos(prev => [...prev, created]);
      setNewTitle('');
    } catch {
      setError('Unable to add a todo');
    } finally {
      setTempTodo(null);
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleDelete = async (todoId: number) => {
    try {
      const response = await fetch(
        `https://mate.academy/students-api/todos/${todoId}`,
        { method: 'DELETE' },
      );

      if (!response.ok) {
        throw new Error();
      }

      setTodos(prev => prev.filter(t => t.id !== todoId));
    } catch {
      setError('Unable to delete a todo');
    }
  };

  const handleClearCompleted = async () => {
    const completed = todos.filter(t => t.completed);

    await Promise.allSettled(
      completed.map(t =>
        fetch(`https://mate.academy/students-api/todos/${t.id}`, {
          method: 'DELETE',
        }).then(res => {
          if (!res.ok) {
            throw new Error();
          }

          setTodos(prev => prev.filter(item => item.id !== t.id));
        }),
      ),
    ).catch(() => {
      setError('Unable to delete a todo');
    });
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title" data-cy="AppTitle">
        todos
      </h1>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          autoFocus
          type="text"
          className="todoapp__new-todo"
          placeholder="What needs to be done?"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          disabled={isLoading}
          data-cy="NewTodoField"
        />
      </form>

      <div
        data-cy="ErrorNotification"
        className={`notification is-danger ${error ? '' : 'hidden'}`}
      >
        {error}
        <button
          type="button"
          className="delete"
          data-cy="HideErrorButton"
          onClick={() => setError(null)}
        />
      </div>

      <ul className="todoapp__list" data-cy="TodoList">
        {todos.map(todo => (
          <li key={todo.id} className="todo" data-cy="Todo">
            <span>{todo.title}</span>
            <button
              type="button"
              className="todo__remove"
              data-cy="TodoDelete"
              onClick={() => handleDelete(todo.id)}
            >
              ×
            </button>
          </li>
        ))}

        {tempTodo && (
          <li className="todo" data-cy="Todo">
            <span>{tempTodo.title}</span>

            <span className="loader is-active" data-cy="TodoLoader" />

            <button
              type="button"
              className="todo__remove"
              data-cy="TodoDelete"
              disabled
            >
              ×
            </button>
          </li>
        )}
      </ul>

      {todos.length > 0 && (
        <footer className="todoapp__footer" data-cy="Footer">
          <button
            type="button"
            className="todoapp__clear-completed"
            data-cy="ClearCompletedButton"
            disabled={!todos.some(t => t.completed)}
            onClick={handleClearCompleted}
          >
            Clear completed
          </button>
        </footer>
      )}
    </div>
  );
};
