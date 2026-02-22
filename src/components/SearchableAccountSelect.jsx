// Reusable searchable account combobox for Journal Entry and other forms.
// Filter by account code or account name; keyboard navigable.
// Dropdown is portaled and fixed-positioned so it stays on top and doesn't close when using the scrollbar.
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";

const PLACEHOLDER = "Search by code or name...";
// Must be above app modals/overlays (e.g. index.css uses 99999, 100001)
const DROPDOWN_Z_INDEX = 100002;

function getAccountLabel(account) {
  if (!account) return "";
  const code = account.account_code ?? "";
  const name = account.account_name ?? "";
  return code && name ? `${code} - ${name}` : name || code || "";
}

function filterAccounts(accounts, query) {
  if (!accounts?.length) return [];
  const q = (query || "").trim().toLowerCase();
  if (!q) return accounts;
  return accounts.filter(
    (acc) =>
      (acc.account_code && String(acc.account_code).toLowerCase().includes(q)) ||
      (acc.account_name && String(acc.account_name).toLowerCase().includes(q))
  );
}

export default function SearchableAccountSelect({
  accounts = [],
  value,
  onChange,
  disabled = false,
  required = false,
  invalid = false,
  placeholder = PLACEHOLDER,
  size,
  id,
  "aria-label": ariaLabel,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [dropdownRect, setDropdownRect] = useState({ top: 0, left: 0, width: 200 });
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const selectedAccount = useMemo(
    () => accounts.find((a) => String(a.id) === String(value)),
    [accounts, value]
  );
  const displayText = open ? query : getAccountLabel(selectedAccount) || "";

  const filtered = useMemo(
    () => filterAccounts(accounts, open ? query : ""),
    [accounts, open, query]
  );

  const updateDropdownRect = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  // When dropdown opens, measure input position before paint so dropdown isn't briefly at (0,0)
  useLayoutEffect(() => {
    if (open && inputRef.current) {
      updateDropdownRect();
    }
  }, [open, updateDropdownRect]);

  // Keep dropdown position in sync when modal/page scrolls or resizes
  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updateDropdownRect();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, updateDropdownRect]);

  // When dropdown opens, reset highlight
  useEffect(() => {
    if (open) {
      setHighlightIndex(0);
    }
  }, [open, filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector("[data-highlighted='true']");
    if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, highlightIndex, filtered]);

  // Close only on mousedown outside (not on blur) so clicking the scrollbar doesn't close
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        listRef.current &&
        !listRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleFocus = () => {
    if (disabled) return;
    setOpen(true);
    if (!query && !selectedAccount) setQuery("");
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  const selectAccount = (account) => {
    onChange(account?.id ?? "");
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % Math.max(1, filtered.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) =>
        filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const acc = filtered[highlightIndex];
      if (acc) selectAccount(acc);
      return;
    }
  };

  const inputSizeClass = size === "sm" ? "form-control-sm" : "";
  const invalidClass = invalid ? "is-invalid" : "";

  const dropdownStyle = {
    position: "fixed",
    top: dropdownRect.top,
    left: dropdownRect.left,
    width: dropdownRect.width,
    maxHeight: "220px",
    overflowY: "auto",
    zIndex: DROPDOWN_Z_INDEX,
  };

  const noMatchStyle = {
    position: "fixed",
    top: dropdownRect.top,
    left: dropdownRect.left,
    width: dropdownRect.width,
    zIndex: DROPDOWN_Z_INDEX,
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`position-relative ${className}`}
        style={{ minWidth: "180px" }}
      >
        <input
          ref={inputRef}
          type="text"
          id={id}
          className={`form-control ${inputSizeClass} ${invalidClass}`}
          value={displayText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          placeholder={open ? placeholder : selectedAccount ? "" : "Select Account"}
          autoComplete="off"
          aria-label={ariaLabel || "Select account"}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-autocomplete="list"
        />
      </div>
      {open && filtered.length > 0 &&
        createPortal(
          <ul
            ref={listRef}
            className="list-group shadow border rounded mt-0 bg-white"
            style={{ ...dropdownStyle, background: "#fff" }}
            role="listbox"
          >
            {filtered.map((account, i) => (
              <li
                key={account.id}
                role="option"
                data-highlighted={i === highlightIndex}
                aria-selected={String(account.id) === String(value)}
                className={`list-group-item list-group-item-action py-2 px-3 ${
                  i === highlightIndex ? "active" : ""
                }`}
                style={{ cursor: "pointer", fontSize: "0.9rem" }}
                onMouseEnter={() => setHighlightIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectAccount(account);
                }}
              >
                <span className="fw-medium text-muted me-2">
                  {account.account_code}
                </span>
                <span>{account.account_name}</span>
              </li>
            ))}
          </ul>,
          document.body
        )}
      {open && query.trim() && filtered.length === 0 &&
        createPortal(
          <div
            className="px-3 py-2 border rounded text-muted small shadow"
            style={{ ...noMatchStyle, background: "#fff" }}
          >
            No account matching &quot;{query.trim()}&quot;
          </div>,
          document.body
        )}
    </>
  );
}
