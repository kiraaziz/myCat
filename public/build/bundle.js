
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Screen.svelte generated by Svelte v3.55.1 */

    const file$5 = "src\\components\\Screen.svelte";

    function create_fragment$6(ctx) {
    	let main;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if (default_slot) default_slot.c();
    			attr_dev(main, "class", "h-screen w-screen flex items-center justify-center flex-row bg-gray-900");
    			add_location(main, file$5, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);

    			if (default_slot) {
    				default_slot.m(main, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Screen', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Screen> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Screen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Screen",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src\components\Search.svelte generated by Svelte v3.55.1 */
    const file$4 = "src\\components\\Search.svelte";

    function create_fragment$5(ctx) {
    	let div;
    	let input;
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Roll";
    			attr_dev(input, "class", "f1 w-full h-14 border-2 border-red-400 rounded bg-gray-900 p-3 text-xl text-white");
    			attr_dev(input, "placeholder", "Roll me some where ..");
    			add_location(input, file$4, 15, 4, 309);
    			attr_dev(button, "class", "f1 bg-red-400 h-14 w-20 text-center ml-2 rounded text-white text-xl");
    			add_location(button, file$4, 16, 4, 471);
    			attr_dev(div, "class", "w-full h-1/6 flex items-center justify-center flex-row pr-10 pl-10");
    			add_location(div, file$4, 14, 0, 223);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, input);
    			set_input_value(input, /*rollText*/ ctx[0]);
    			append_dev(div, t0);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(button, "click", /*rollUp*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*rollText*/ 1 && input.value !== /*rollText*/ ctx[0]) {
    				set_input_value(input, /*rollText*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Search', slots, []);
    	let rollText;
    	let dispatch = createEventDispatcher();

    	const rollUp = () => {
    		dispatch("rollUp", rollText);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Search> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		rollText = this.value;
    		$$invalidate(0, rollText);
    	}

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		rollText,
    		dispatch,
    		rollUp
    	});

    	$$self.$inject_state = $$props => {
    		if ('rollText' in $$props) $$invalidate(0, rollText = $$props.rollText);
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [rollText, rollUp, input_input_handler];
    }

    class Search extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Search",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\Main.svelte generated by Svelte v3.55.1 */

    const file$3 = "src\\components\\Main.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[1].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[0], null);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			attr_dev(div, "class", "w-full p-3 h-full flex items-center justify-center flex-col");
    			add_location(div, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 1)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[0],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[0])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[0], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Main', slots, ['default']);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Main> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(0, $$scope = $$props.$$scope);
    	};

    	return [$$scope, slots];
    }

    class Main extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Main",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\components\Tab.svelte generated by Svelte v3.55.1 */
    const file$2 = "src\\components\\Tab.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (24:12) {#if pageRout === rout.name}
    function create_if_block$3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "h-2 w-1/3 bg-gray-900 rounded-full");
    			add_location(div, file$2, 24, 16, 1012);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(24:12) {#if pageRout === rout.name}",
    		ctx
    	});

    	return block;
    }

    // (21:4) {#each routersName as rout}
    function create_each_block$2(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let t0;
    	let t1;
    	let button_class_value;
    	let mounted;
    	let dispose;
    	let if_block = /*pageRout*/ ctx[0] === /*rout*/ ctx[5].name && create_if_block$3(ctx);

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*rout*/ ctx[5]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			img = element("img");
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			if (!src_url_equal(img.src, img_src_value = `./assets/navIcon/${/*rout*/ ctx[5].img}`)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "h-10 w-10");
    			attr_dev(img, "alt", "like");
    			add_location(img, file$2, 22, 12, 879);

    			attr_dev(button, "class", button_class_value = `opacity-${/*pageRout*/ ctx[0] === /*rout*/ ctx[5].name
			? "100"
			: "70"} hover:opacity-100 flex items-center justify-center flex-col h-12 w-12 m-2 `);

    			add_location(button, file$2, 21, 8, 684);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, img);
    			append_dev(button, t0);
    			if (if_block) if_block.m(button, null);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (/*pageRout*/ ctx[0] === /*rout*/ ctx[5].name) {
    				if (if_block) ; else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					if_block.m(button, t1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*pageRout*/ 1 && button_class_value !== (button_class_value = `opacity-${/*pageRout*/ ctx[0] === /*rout*/ ctx[5].name
			? "100"
			: "70"} hover:opacity-100 flex items-center justify-center flex-col h-12 w-12 m-2 `)) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(21:4) {#each routersName as rout}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let each_value = /*routersName*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "w-20 h-full flex items-center justify-center bg-red-400 flex items-center justify-center flex-col");
    			add_location(div, file$2, 19, 0, 530);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*pageRout, routersName, handleRout*/ 7) {
    				each_value = /*routersName*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tab', slots, []);
    	const dispatcher = createEventDispatcher();

    	const handleRout = rout => {
    		dispatcher("handleRout", rout);
    	};

    	let { pageRout } = $$props;

    	const routersName = [
    		{ name: "Home", img: "cat.svg" },
    		{ name: "Likes", img: "like.svg" },
    		{ name: "Saved", img: "save.svg" },
    		{ name: "Download", img: "download.svg" }
    	];

    	$$self.$$.on_mount.push(function () {
    		if (pageRout === undefined && !('pageRout' in $$props || $$self.$$.bound[$$self.$$.props['pageRout']])) {
    			console.warn("<Tab> was created without expected prop 'pageRout'");
    		}
    	});

    	const writable_props = ['pageRout'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tab> was created with unknown prop '${key}'`);
    	});

    	const click_handler = rout => {
    		handleRout(rout.name);
    	};

    	$$self.$$set = $$props => {
    		if ('pageRout' in $$props) $$invalidate(0, pageRout = $$props.pageRout);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatcher,
    		handleRout,
    		pageRout,
    		routersName
    	});

    	$$self.$inject_state = $$props => {
    		if ('pageRout' in $$props) $$invalidate(0, pageRout = $$props.pageRout);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [pageRout, handleRout, routersName, click_handler];
    }

    class Tab extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { pageRout: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tab",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get pageRout() {
    		throw new Error("<Tab>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pageRout(value) {
    		throw new Error("<Tab>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var IDX=256, HEX=[], SIZE=256, BUFFER;
    while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);

    function uid(len) {
    	var i=0, tmp=(len || 11);
    	if (!BUFFER || ((IDX + tmp) > SIZE*2)) {
    		for (BUFFER='',IDX=0; i < SIZE; i++) {
    			BUFFER += HEX[Math.random() * 256 | 0];
    		}
    	}

    	return BUFFER.substring(IDX, IDX++ + tmp);
    }

    /* src\components\List.svelte generated by Svelte v3.55.1 */
    const file$1 = "src\\components\\List.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (54:4) {#if loading }
    function create_if_block_2(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			attr_dev(img, "class", "h-60 w-60 ");
    			attr_dev(img, "alt", "loading");
    			if (!src_url_equal(img.src, img_src_value = "./assets/svg/loading.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$1, 55, 12, 1724);
    			attr_dev(div, "class", "h-full w-full flex items-center justify-center");
    			add_location(div, file$1, 54, 8, 1650);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(54:4) {#if loading }",
    		ctx
    	});

    	return block;
    }

    // (59:4) {#if imageList.length === 0 && !loading}
    function create_if_block_1(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			attr_dev(img, "class", "h-60 w-60 ");
    			attr_dev(img, "alt", "loading");
    			if (!src_url_equal(img.src, img_src_value = "./assets/svg/error.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$1, 60, 8, 1944);
    			attr_dev(div, "class", "h-full w-full flex items-center justify-center");
    			add_location(div, file$1, 59, 4, 1874);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(59:4) {#if imageList.length === 0 && !loading}",
    		ctx
    	});

    	return block;
    }

    // (77:12) {:else}
    function create_else_block$1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "h-10 w-10 border-2 border-red-500 bg-gray-900 p-1");
    			attr_dev(img, "alt", "loading");
    			if (!src_url_equal(img.src, img_src_value = "./assets/svg/loading.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$1, 77, 16, 3318);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(77:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (67:12) {#if !onWait.includes(index)}
    function create_if_block$2(ctx) {
    	let button0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let button1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let button2;
    	let img2;
    	let img2_src_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[4](/*image*/ ctx[11], /*index*/ ctx[13]);
    	}

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[5](/*image*/ ctx[11], /*index*/ ctx[13]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[6](/*image*/ ctx[11], /*index*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			img0 = element("img");
    			t0 = space();
    			button1 = element("button");
    			img1 = element("img");
    			t1 = space();
    			button2 = element("button");
    			img2 = element("img");
    			attr_dev(img0, "class", "h-7 w-7 ");
    			attr_dev(img0, "alt", "loading");
    			if (!src_url_equal(img0.src, img0_src_value = "./assets/icons/like.svg")) attr_dev(img0, "src", img0_src_value);
    			add_location(img0, file$1, 68, 20, 2558);
    			attr_dev(button0, "class", "bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center");
    			add_location(button0, file$1, 67, 16, 2360);
    			attr_dev(img1, "class", "h-7 w-7 ");
    			attr_dev(img1, "alt", "loading");
    			if (!src_url_equal(img1.src, img1_src_value = "./assets/icons/save.svg")) attr_dev(img1, "src", img1_src_value);
    			add_location(img1, file$1, 71, 20, 2868);
    			attr_dev(button1, "class", "bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center");
    			add_location(button1, file$1, 70, 16, 2670);
    			attr_dev(img2, "class", "h-7 w-7 ");
    			attr_dev(img2, "alt", "loading");
    			if (!src_url_equal(img2.src, img2_src_value = "./assets/icons/download.svg")) attr_dev(img2, "src", img2_src_value);
    			add_location(img2, file$1, 74, 20, 3181);
    			attr_dev(button2, "class", "bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center");
    			add_location(button2, file$1, 73, 16, 2980);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, img0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, img1);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button2, anchor);
    			append_dev(button2, img2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler, false, false, false),
    					listen_dev(button1, "click", click_handler_1, false, false, false),
    					listen_dev(button2, "click", click_handler_2, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(67:12) {#if !onWait.includes(index)}",
    		ctx
    	});

    	return block;
    }

    // (64:4) {#each imageList as image, index}
    function create_each_block$1(ctx) {
    	let div1;
    	let div0;
    	let show_if;
    	let div0_style_value;
    	let t;

    	function select_block_type(ctx, dirty) {
    		if (dirty & /*onWait*/ 4) show_if = null;
    		if (show_if == null) show_if = !!!/*onWait*/ ctx[2].includes(/*index*/ ctx[13]);
    		if (show_if) return create_if_block$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx, -1);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t = space();
    			attr_dev(div0, "style", div0_style_value = `background-image: url(${/*image*/ ctx[11].url});`);
    			attr_dev(div0, "class", "flex items-center justify-center flex-row image h-full w-full shadow-2xl border-red-400");
    			add_location(div0, file$1, 65, 8, 2151);
    			attr_dev(div1, "class", "w-1/3 h-60 p-1 flex items-center justify-center");
    			add_location(div1, file$1, 64, 4, 2080);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if_block.m(div0, null);
    			append_dev(div1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty & /*imageList*/ 1 && div0_style_value !== (div0_style_value = `background-image: url(${/*image*/ ctx[11].url});`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(64:4) {#each imageList as image, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block0 = /*loading*/ ctx[1] && create_if_block_2(ctx);
    	let if_block1 = /*imageList*/ ctx[0].length === 0 && !/*loading*/ ctx[1] && create_if_block_1(ctx);
    	let each_value = /*imageList*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "w-11/12 h-full overflow-y-auto flex flex-wrap p-3");
    			add_location(div, file$1, 52, 0, 1557);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block0) if_block0.m(div, null);
    			append_dev(div, t0);
    			if (if_block1) if_block1.m(div, null);
    			append_dev(div, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*loading*/ ctx[1]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(div, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*imageList*/ ctx[0].length === 0 && !/*loading*/ ctx[1]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(div, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*imageList, upToCat, onWait*/ 13) {
    				each_value = /*imageList*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('List', slots, []);
    	const download = require('image-downloader');
    	const path = require('path');
    	const dispatcher = createEventDispatcher();
    	let { imageList } = $$props;
    	let { loading } = $$props;
    	let onWait = [];

    	const sentSQL = query => {
    		dispatcher("sentSQL", query);
    	};

    	const upToCat = (table, image, index) => {
    		let query;

    		if (table === "Download") {
    			$$invalidate(2, onWait = [...onWait, index]);
    			let newName = `${uid(32)}.jpg`;

    			let options = {
    				url: image.url,
    				dest: path.join(`${__dirname}/../../../../../../public/download/${newName}`)
    			};

    			query = `INSERT INTO '${table}' (url, height, width) VALUES ( './download/${newName}', '${image.height}', '${image.width}')`;

    			download.image(options).then(() => {
    				$$invalidate(2, onWait = [
    					...onWait.filter(val => {
    					})
    				]);

    				sentSQL(query);
    			}).catch(err => {
    				alert(err);

    				$$invalidate(2, onWait = [
    					...onWait.filter(val => {
    					})
    				]);
    			});
    		} else {
    			query = `INSERT INTO '${table}' (url, height, width) VALUES ( '${image.url}', '${image.height}', '${image.width}')`;
    			sentSQL(query);
    		}
    	};

    	$$self.$$.on_mount.push(function () {
    		if (imageList === undefined && !('imageList' in $$props || $$self.$$.bound[$$self.$$.props['imageList']])) {
    			console.warn("<List> was created without expected prop 'imageList'");
    		}

    		if (loading === undefined && !('loading' in $$props || $$self.$$.bound[$$self.$$.props['loading']])) {
    			console.warn("<List> was created without expected prop 'loading'");
    		}
    	});

    	const writable_props = ['imageList', 'loading'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	const click_handler = (image, index) => {
    		upToCat("Likes", image, index);
    	};

    	const click_handler_1 = (image, index) => {
    		upToCat("Saved", image, index);
    	};

    	const click_handler_2 = (image, index) => {
    		upToCat("Download", image, index);
    	};

    	$$self.$$set = $$props => {
    		if ('imageList' in $$props) $$invalidate(0, imageList = $$props.imageList);
    		if ('loading' in $$props) $$invalidate(1, loading = $$props.loading);
    	};

    	$$self.$capture_state = () => ({
    		uid,
    		createEventDispatcher,
    		download,
    		path,
    		dispatcher,
    		imageList,
    		loading,
    		onWait,
    		sentSQL,
    		upToCat
    	});

    	$$self.$inject_state = $$props => {
    		if ('imageList' in $$props) $$invalidate(0, imageList = $$props.imageList);
    		if ('loading' in $$props) $$invalidate(1, loading = $$props.loading);
    		if ('onWait' in $$props) $$invalidate(2, onWait = $$props.onWait);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		imageList,
    		loading,
    		onWait,
    		upToCat,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { imageList: 0, loading: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "List",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get imageList() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageList(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get loading() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set loading(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ReadyList.svelte generated by Svelte v3.55.1 */
    const file = "src\\components\\ReadyList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	child_ctx[6] = i;
    	return child_ctx;
    }

    // (15:4) {#each imageList as image, index}
    function create_each_block(ctx) {
    	let div1;
    	let div0;
    	let button;
    	let img;
    	let img_src_value;
    	let div0_style_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[2](/*image*/ ctx[4]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			button = element("button");
    			img = element("img");
    			attr_dev(img, "class", "h-7 w-7 ");
    			attr_dev(img, "alt", "loading");
    			if (!src_url_equal(img.src, img_src_value = "./assets/icons/trash.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 18, 16, 763);
    			attr_dev(button, "class", "bg-gray-900 opacity-60 hover:opacity-100 h-12 w-12 border-2 border-red-500 m-1 flex items-center justify-center");
    			add_location(button, file, 17, 12, 581);
    			attr_dev(div0, "style", div0_style_value = `background-image: url(${/*image*/ ctx[4].url});`);
    			attr_dev(div0, "class", "flex items-center justify-center flex-row image h-full w-full shadow-2xl border-red-400");
    			add_location(div0, file, 16, 8, 418);
    			attr_dev(div1, "class", "w-1/3 h-60 p-1 flex items-center justify-center");
    			add_location(div1, file, 15, 4, 347);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			append_dev(button, img);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*imageList*/ 1 && div0_style_value !== (div0_style_value = `background-image: url(${/*image*/ ctx[4].url});`)) {
    				attr_dev(div0, "style", div0_style_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(15:4) {#each imageList as image, index}",
    		ctx
    	});

    	return block;
    }

    // (24:4) {#if imageList.length === 0 }
    function create_if_block$1(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			attr_dev(img, "class", "h-60 w-60 ");
    			attr_dev(img, "alt", "loading");
    			if (!src_url_equal(img.src, img_src_value = "./assets/svg/error.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 25, 8, 1011);
    			attr_dev(div, "class", "h-full w-full flex items-center justify-center");
    			add_location(div, file, 24, 4, 941);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(24:4) {#if imageList.length === 0 }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let t;
    	let each_value = /*imageList*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*imageList*/ ctx[0].length === 0 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "w-11/12 h-full overflow-y-auto flex flex-wrap p-3");
    			add_location(div, file, 13, 0, 238);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*imageList, sentSQL*/ 3) {
    				each_value = /*imageList*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*imageList*/ ctx[0].length === 0) {
    				if (if_block) ; else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ReadyList', slots, []);
    	let { imageList = [] } = $$props;
    	const dispatcher = createEventDispatcher();

    	const sentSQL = id => {
    		dispatcher("deleleSQL", id);
    	};

    	const writable_props = ['imageList'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ReadyList> was created with unknown prop '${key}'`);
    	});

    	const click_handler = image => {
    		sentSQL(image.url);
    	};

    	$$self.$$set = $$props => {
    		if ('imageList' in $$props) $$invalidate(0, imageList = $$props.imageList);
    	};

    	$$self.$capture_state = () => ({
    		imageList,
    		createEventDispatcher,
    		dispatcher,
    		sentSQL
    	});

    	$$self.$inject_state = $$props => {
    		if ('imageList' in $$props) $$invalidate(0, imageList = $$props.imageList);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [imageList, sentSQL, click_handler];
    }

    class ReadyList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { imageList: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ReadyList",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get imageList() {
    		throw new Error("<ReadyList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set imageList(value) {
    		throw new Error("<ReadyList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.55.1 */

    const { console: console_1 } = globals;

    // (74:8) {:else}
    function create_else_block(ctx) {
    	let readylist;
    	let current;

    	readylist = new ReadyList({
    			props: { imageList: /*imageList*/ ctx[0] },
    			$$inline: true
    		});

    	readylist.$on("deleleSQL", /*deleleSQL_handler*/ ctx[9]);

    	const block = {
    		c: function create() {
    			create_component(readylist.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(readylist, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const readylist_changes = {};
    			if (dirty & /*imageList*/ 1) readylist_changes.imageList = /*imageList*/ ctx[0];
    			readylist.$set(readylist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(readylist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(readylist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(readylist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(74:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (67:8) {#if pageRout === "Home"}
    function create_if_block(ctx) {
    	let search;
    	let t;
    	let list;
    	let current;
    	search = new Search({ $$inline: true });
    	search.$on("rollUp", /*rollUp_handler*/ ctx[7]);

    	list = new List({
    			props: {
    				loading: /*loading*/ ctx[2],
    				imageList: /*imageList*/ ctx[0]
    			},
    			$$inline: true
    		});

    	list.$on("sentSQL", /*sentSQL_handler*/ ctx[8]);

    	const block = {
    		c: function create() {
    			create_component(search.$$.fragment);
    			t = space();
    			create_component(list.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(search, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(list, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const list_changes = {};
    			if (dirty & /*loading*/ 4) list_changes.loading = /*loading*/ ctx[2];
    			if (dirty & /*imageList*/ 1) list_changes.imageList = /*imageList*/ ctx[0];
    			list.$set(list_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(search.$$.fragment, local);
    			transition_in(list.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(search.$$.fragment, local);
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(search, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(list, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(67:8) {#if pageRout === \\\"Home\\\"}",
    		ctx
    	});

    	return block;
    }

    // (66:4) <Main>
    function create_default_slot_1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*pageRout*/ ctx[1] === "Home") return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(66:4) <Main>",
    		ctx
    	});

    	return block;
    }

    // (64:0) <Screen>
    function create_default_slot(ctx) {
    	let tab;
    	let t;
    	let main;
    	let current;

    	tab = new Tab({
    			props: { pageRout: /*pageRout*/ ctx[1] },
    			$$inline: true
    		});

    	tab.$on("handleRout", /*handleRout_handler*/ ctx[6]);

    	main = new Main({
    			props: {
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tab.$$.fragment);
    			t = space();
    			create_component(main.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tab, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(main, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tab_changes = {};
    			if (dirty & /*pageRout*/ 2) tab_changes.pageRout = /*pageRout*/ ctx[1];
    			tab.$set(tab_changes);
    			const main_changes = {};

    			if (dirty & /*$$scope, loading, imageList, pageRout*/ 4103) {
    				main_changes.$$scope = { dirty, ctx };
    			}

    			main.$set(main_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tab.$$.fragment, local);
    			transition_in(main.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tab.$$.fragment, local);
    			transition_out(main.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tab, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(main, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(64:0) <Screen>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let screen;
    	let current;

    	screen = new Screen({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(screen.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(screen, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const screen_changes = {};

    			if (dirty & /*$$scope, loading, imageList, pageRout*/ 4103) {
    				screen_changes.$$scope = { dirty, ctx };
    			}

    			screen.$set(screen_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(screen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(screen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(screen, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const google = require("g-i-s");
    	const sqlite3 = require('sqlite3').verbose();
    	const catDB = new sqlite3.Database('./myDataBase/catDB.sql');
    	let imageList = [];
    	let pageRout = "Home";
    	let loading = false;

    	const loadImages = imageName => {
    		if (imageName) {
    			google(imageName, logResults);
    			$$invalidate(0, imageList = []);
    			$$invalidate(2, loading = true);

    			function logResults(error, results) {
    				if (error) {
    					console.log(error);
    				} else {
    					$$invalidate(0, imageList = results);
    					console.log(results);
    				}

    				$$invalidate(2, loading = false);
    			}
    		} else {
    			$$invalidate(2, loading = false);
    			$$invalidate(0, imageList = []);
    		}
    	};

    	const handleRout = rout => {
    		$$invalidate(1, pageRout = rout);
    		$$invalidate(0, imageList = []);

    		if (rout !== "Home") {
    			catDB.serialize(async () => {
    				let query = `SELECT * FROM '${pageRout}'`;

    				catDB.each(query, (err, data) => {
    					if (!err) {
    						$$invalidate(0, imageList = [data, ...imageList]);
    					}
    				});
    			});
    		}
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const handleRout_handler = e => {
    		handleRout(e.detail);
    	};

    	const rollUp_handler = e => {
    		loadImages(e.detail);
    	};

    	const sentSQL_handler = e => {
    		catDB.serialize(async () => {
    			catDB.run(e.detail);
    		});
    	};

    	const deleleSQL_handler = e => {
    		let query = `DELETE FROM '${pageRout}' WHERE url = '${e.detail}'`;

    		catDB.serialize(async () => {
    			catDB.run(query);
    		});

    		handleRout(pageRout);
    	};

    	$$self.$capture_state = () => ({
    		Screen,
    		Search,
    		Main,
    		Tab,
    		List,
    		ReadyList,
    		google,
    		sqlite3,
    		catDB,
    		imageList,
    		pageRout,
    		loading,
    		loadImages,
    		handleRout
    	});

    	$$self.$inject_state = $$props => {
    		if ('imageList' in $$props) $$invalidate(0, imageList = $$props.imageList);
    		if ('pageRout' in $$props) $$invalidate(1, pageRout = $$props.pageRout);
    		if ('loading' in $$props) $$invalidate(2, loading = $$props.loading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		imageList,
    		pageRout,
    		loading,
    		catDB,
    		loadImages,
    		handleRout,
    		handleRout_handler,
    		rollUp_handler,
    		sentSQL_handler,
    		deleleSQL_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
