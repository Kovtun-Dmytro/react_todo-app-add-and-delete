/* eslint-disable max-len */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
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
  const [error, setError] = useState<string>('');
  const [loadingTodoId, setLoadingTodoId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (error) {
      timer = setTimeout(() => setError(''), 3000);
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
          throw new Error();
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

    const temp: Todo = { id: 0, userId: USER_ID, title, completed: false };

    setTempTodo(temp);
    setLoadingTodoId(0);

    if (inputRef.current) {
      inputRef.current.disabled = true;
    }

    try {
      const response = await fetch('https://mate.academy/students-api/todos', {
        method: 'POST',
        body: JSON.stringify({ title, userId: USER_ID, completed: false }),
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
      setLoadingTodoId(null);

      if (inputRef.current) {
        inputRef.current.disabled = false;
        inputRef.current.focus();
      }
    }
  };

  const handleDelete = async (todoId: number) => {
    setLoadingTodoId(todoId);
    try {
      const res = await fetch(
        `https://mate.academy/students-api/todos/${todoId}`,
        { method: 'DELETE' },
      );

      if (!res.ok) {
        throw new Error();
      }

      setTodos(prev => prev.filter(t => t.id !== todoId));
    } catch {
      setError('Unable to delete a todo');
    } finally {
      setLoadingTodoId(null);
      inputRef.current?.focus();
    }
  };

  const handleClearCompleted = async () => {
    const completed = todos.filter(t => t.completed);
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

    if (results.some(r => r.status === 'rejected')) {
      setError('Unable to delete a todo');
    }
  };

  const handleToggleStatus = async (todo: Todo) => {
    setLoadingTodoId(todo.id);
    try {
      const response = await fetch(
        `https://mate.academy/students-api/todos/${todo.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ completed: !todo.completed }),
          headers: { 'Content-type': 'application/json; charset=UTF-8' },
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      const updated: Todo = await response.json();

      setTodos(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch {
      setError('Unable to update a todo');
    } finally {
      setLoadingTodoId(null);
    }
  };

  const handleToggleAll = async () => {
    const shouldComplete = !todos.every(t => t.completed);

    try {
      const results = await Promise.allSettled(
        todos.map(todo =>
          fetch(`https://mate.academy/students-api/todos/${todo.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ completed: shouldComplete }),
            headers: { 'Content-type': 'application/json; charset=UTF-8' },
          }).then(res => {
            if (!res.ok) {
              throw new Error();
            }

            return res.json();
          }),
        ),
      );
      const updated = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<Todo>).value);

      setTodos(prev => prev.map(t => updated.find(u => u.id === t.id) || t));
    } catch {
      setError('Unable to update todos');
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

      <header className="todoapp__header">
        <button
          type="button"
          className={classNames('todoapp__toggle-all', {
            active: todos.length > 0 && todos.every(t => t.completed),
          })}
          data-cy="ToggleAllButton"
          onClick={handleToggleAll}
        />
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            className="todoapp__new-todo"
            placeholder="What needs to be done?"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            disabled={loadingTodoId !== null}
            data-cy="NewTodoField"
          />
        </form>
      </header>

      <div
        data-cy="ErrorNotification"
        className={classNames(
          'notification',
          'is-danger',
          'is-light',
          'has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button
          type="button"
          className="delete"
          data-cy="HideErrorButton"
          onClick={() => setError('')}
        />
        {error}
      </div>

      <ul className="todoapp__list" data-cy="TodoList">
        {visibleTodos.map(todo => (
          <li
            key={todo.id}
            className={classNames('todo', { completed: todo.completed })}
            data-cy="Todo"
          >
            <label className="todo__status-label">
              <input
                type="checkbox"
                className="todo__status"
                data-cy="TodoStatus"
                checked={todo.completed}
                onChange={() => handleToggleStatus(todo)}
                aria-label="Toggle todo status"
              />
            </label>

            <span data-cy="TodoTitle" className="todo__title">
              {todo.title}
            </span>

            <button
              type="button"
              className="todo__remove"
              data-cy="TodoDelete"
              onClick={() => handleDelete(todo.id)}
            >
              ×
            </button>

            <div
              data-cy="TodoLoader"
              className={classNames('modal overlay', {
                'is-active': loadingTodoId === todo.id,
              })}
            >
              <div className="modal-background has-background-white-ter" />
              <div className="loader" />
            </div>
          </li>
        ))}

        {tempTodo && (
          <li
            className={classNames('todo', { completed: tempTodo.completed })}
            data-cy="Todo"
          >
            <label className="todo__status-label">
              <input
                type="checkbox"
                className="todo__status"
                data-cy="TodoStatus"
                checked={tempTodo.completed}
                readOnly
                aria-label="Temporary todo status"
              />
            </label>

            <span data-cy="TodoTitle" className="todo__title">
              Todo is being saved now
            </span>

            <button
              type="button"
              className="todo__remove"
              data-cy="TodoDelete"
              disabled
            >
              ×
            </button>

            <div
              data-cy="TodoLoader"
              className={classNames('modal overlay', {
                'is-active': loadingTodoId === 0,
              })}
            >
              <div className="modal-background has-background-white-ter" />
              <div className="loader" />
            </div>
          </li>
        )}
      </ul>

      {todos.length > 0 && (
        <footer className="todoapp__footer" data-cy="Footer">
          <span data-cy="TodosCounter">
            {todos.filter(t => !t.completed).length}{' '}
            {todos.filter(t => !t.completed).length === 1
              ? 'item left'
              : 'items left'}
          </span>

          <nav className="filter" data-cy="Filter">
            <a
              href="#/"
              className={classNames('filter__link', {
                selected: filter === 'all',
              })}
              data-cy="FilterLinkAll"
              onClick={() => setFilter('all')}
            >
              All
            </a>
            <a
              href="#/active"
              className={classNames('filter__link', {
                selected: filter === 'active',
              })}
              data-cy="FilterLinkActive"
              onClick={() => setFilter('active')}
            >
              Active
            </a>
            <a
              href="#/completed"
              className={classNames('filter__link', {
                selected: filter === 'completed',
              })}
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
