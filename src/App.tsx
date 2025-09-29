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

type Filter = 'all' | 'active' | 'completed';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (error) {
      timer = setTimeout(() => setError(null), 3000);
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
      inputRef.current?.focus();

      return;
    }

    setIsLoading(true);

    const temp: Todo = {
      id: 0,
      userId: USER_ID,
      title,
      completed: false,
    };

    setTempTodo(temp);
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
    setProcessingIds(prev => {
      const next = new Set(prev);

      next.add(todoId);

      return next;
    });

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
      setProcessingIds(prev => {
        const next = new Set(prev);

        next.delete(todoId);

        return next;
      });
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleClearCompleted = async () => {
    const completed = todos.filter(t => t.completed);
    const ids = completed.map(t => t.id);

    setProcessingIds(prev => {
      const next = new Set(prev);

      ids.forEach(id => next.add(id));

      return next;
    });

    const results = await Promise.allSettled(
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
    );

    const failedIds = ids.filter((_, i) => results[i].status === 'rejected');

    if (failedIds.length) {
      setError('Unable to delete a todo');
      setProcessingIds(prev => {
        const next = new Set(prev);

        failedIds.forEach(id => next.delete(id));

        return next;
      });
    } else {
      inputRef.current?.focus();
    }
  };

  const visibleTodos = todos.filter(todo => {
    switch (filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

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
        {visibleTodos.map(todo => {
          const isProcessing = processingIds.has(todo.id);

          return (
            <li
              key={todo.id}
              className={`todo ${todo.completed ? 'completed' : ''}`}
              data-cy="Todo"
            >
              <input
                type="checkbox"
                className="todo__status"
                data-cy="TodoStatus"
                checked={todo.completed}
                readOnly
              />
              <span data-cy="TodoTitle">{todo.title}</span>

              <span
                className={`loader ${isProcessing ? 'is-active' : ''}`}
                data-cy="TodoLoader"
              />

              <button
                type="button"
                className="todo__remove"
                data-cy="TodoDelete"
                onClick={() => handleDelete(todo.id)}
                disabled={isProcessing}
              >
                ×
              </button>
            </li>
          );
        })}

        {tempTodo && (
          <li
            className={`todo ${tempTodo.completed ? 'completed' : ''}`}
            data-cy="Todo"
          >
            <input
              type="checkbox"
              className="todo__status"
              data-cy="TodoStatus"
              checked={tempTodo.completed}
              readOnly
            />
            <span data-cy="TodoTitle">{tempTodo.title}</span>

            <span
              className={`loader ${isLoading ? 'is-active' : ''}`}
              data-cy="TodoLoader"
            />

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
          <span data-cy="TodosCounter">
            {todos.filter(t => !t.completed).length} items left
          </span>

          <nav className="filter" data-cy="Filter">
            <a
              href="#/"
              className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
              data-cy="FilterLinkAll"
              onClick={() => setFilter('all')}
            >
              All
            </a>
            <a
              href="#/active"
              className={`filter__link ${
                filter === 'active' ? 'selected' : ''
              }`}
              data-cy="FilterLinkActive"
              onClick={() => setFilter('active')}
            >
              Active
            </a>
            <a
              href="#/completed"
              className={`filter__link ${
                filter === 'completed' ? 'selected' : ''
              }`}
              data-cy="FilterLinkCompleted"
              onClick={() => setFilter('completed')}
            >
              Completed
            </a>
          </nav>

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
